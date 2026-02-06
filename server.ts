import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { Redis } from "ioredis";
import { jwtVerify } from "jose";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;

// Initialize Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
    const httpServer = createServer(async (req, res) => {
        try {
            const parsedUrl = parse(req.url!, true);
            if (parsedUrl.pathname?.startsWith("/socket.io")) {
                // Let Socket.IO handle the request
                return;
            }
            await handle(req, res, parsedUrl);
        } catch (err) {
            console.error("Error occurred handling", req.url, err);
            res.statusCode = 500;
            res.end("internal server error");
        }
    });

    // Initialize Socket.IO
    const io = new Server(httpServer, {
        cors: {
            origin: "*",
            credentials: true
        }
    });

    // Redis Adapter for scaling (if REDIS_URL is present)
    if (process.env.REDIS_URL) {
        const pubClient = new Redis(process.env.REDIS_URL);
        const subClient = pubClient.duplicate();
        io.adapter(createAdapter(pubClient, subClient));
    }

    // Authentication Middleware
    io.use(async (socket, next) => {
        console.log("[Socket Auth] New connection attempt");
        try {
            const cookieHeader = socket.request.headers.cookie;
            console.log("[Socket Auth] Cookie header:", cookieHeader ? "PRESENT" : "MISSING");

            if (!cookieHeader) {
                console.log("[Socket Auth] REJECTED: No cookie header");
                return next(new Error("Authentication error"));
            }

            // Parse cookies manually
            const getCookie = (name: string) => {
                const match = cookieHeader.match(new RegExp('(^| )' + name + '=([^;]+)'));
                if (match) return match[2];
                return null;
            };

            const token = getCookie("session");
            console.log("[Socket Auth] Session token:", token ? "FOUND" : "NOT FOUND");

            if (!token) {
                console.log("[Socket Auth] REJECTED: No session token");
                return next(new Error("Authentication error"));
            }

            // Inline JWT verification using jose library
            const secretStr = process.env.JWT_SECRET;
            if (!secretStr) {
                console.error("[Socket Auth] REJECTED: JWT_SECRET missing");
                return next(new Error("Server configuration error"));
            }

            const secret = new TextEncoder().encode(secretStr);
            const { payload } = await jwtVerify(token, secret);

            console.log("[Socket Auth] JWT verified, payload.sub:", payload.sub);

            if (!payload || !payload.sub) {
                console.log("[Socket Auth] REJECTED: Invalid token payload");
                return next(new Error("Authentication error: Invalid token"));
            }

            // Attach user info to socket
            (socket as any).userId = payload.sub;
            (socket as any).username = payload.username;

            // Auto-join user's personal room
            socket.join(`user:${payload.sub}`);

            console.log("[Socket Auth] ACCEPTED: User", payload.username, "joined as", payload.sub);
            next();
        } catch (error) {
            console.error("[Socket Auth] REJECTED: Error:", error);
            next(new Error("Authentication error"));
        }
    });

    io.on("connection", (socket) => {
        console.log("[Socket] Client connected:", socket.id);

        socket.on("join-workspace", (workspaceId) => {
            socket.join(`workspace:${workspaceId}`);
            console.log("[Socket] Client joined workspace:", workspaceId);
        });

        socket.on("join-channel", (channelId) => {
            socket.join(`channel:${channelId}`);
            console.log("[Socket] Client joined channel:", channelId);
        });

        socket.on("leave-channel", (channelId) => {
            socket.leave(`channel:${channelId}`);
        });

        socket.on("typing", ({ workspaceId, channelId, recipientId, username }) => {
            // Broadcast to relevant room
            if (channelId) {
                socket.to(`channel:${channelId}`).emit("user_typing", { channelId, username });
            } else if (recipientId) {
                socket.to(`user:${recipientId}`).emit("user_typing", { username });
            }
        });

        socket.on("disconnect", () => {
            console.log("[Socket] Client disconnected:", socket.id);
        });
    });

    httpServer.listen(port, () => {
        console.log(`> Ready on http://${hostname}:${port}`);
    });
});
