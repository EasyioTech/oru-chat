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
    const io = new Server(httpServer);

    // Redis Adapter for scaling (if REDIS_URL is present)
    // Redis Adapter for scaling (if REDIS_URL is present)
    if (process.env.REDIS_URL) {
        const pubClient = new Redis(process.env.REDIS_URL);
        const subClient = pubClient.duplicate();
        io.adapter(createAdapter(pubClient, subClient));
    }

    // Authentication Middleware
    io.use(async (socket, next) => {
        try {
            const cookieHeader = socket.request.headers.cookie;
            if (!cookieHeader) return next(new Error("Authentication error"));

            // Parse cookies manually to avoid external deps if not strictly needed
            // We need the 'session' cookie
            const getCookie = (name: string) => {
                const match = cookieHeader.match(new RegExp('(^| )' + name + '=([^;]+)'));
                if (match) return match[2];
                return null;
            };

            const token = getCookie("session");
            if (!token) return next(new Error("Authentication error"));

            // Dynamic import to avoid issues with top-level imports in some environments
            // leveraging the shared library
            const { verifyToken } = await import("./src/lib/auth");

            const payload = await verifyToken(token);
            if (!payload || !payload.sub) {
                return next(new Error("Authentication error: Invalid token"));
            }

            // Attach user info to socket
            (socket as any).userId = payload.sub;
            (socket as any).username = payload.username;

            // Auto-join user's personal room
            socket.join(`user:${payload.sub}`);

            next();
        } catch (error) {
            console.error("Socket auth error:", error);
            next(new Error("Authentication error"));
        }
    });

    io.on("connection", (socket) => {
        // console.log("Client connected", socket.id, (socket as any).username);


        socket.on("join-workspace", (workspaceId) => {
            socket.join(`workspace:${workspaceId}`);
        });

        socket.on("join-channel", (channelId) => {
            socket.join(`channel:${channelId}`);
        });

        socket.on("leave-channel", (channelId) => {
            socket.leave(`channel:${channelId}`);
        });

        socket.on("typing", ({ workspaceId, channelId, recipientId, username }) => {
            // Broadcast to relevant room
            if (channelId) {
                // Ensure user is authorized for this channel? 
                // For now, rely on workspace/channel rooms which ideally they should be in.
                socket.to(`channel:${channelId}`).emit("user_typing", { channelId, username });
            } else if (recipientId) {
                // DM typing
                socket.to(`user:${recipientId}`).emit("user_typing", { username });
            }
        });

        // socket.on("join-user") removed - handled by auth middleware

        socket.on("disconnect", () => {
            // console.log("Client disconnected");
        });
    });

    httpServer.listen(port, () => {
        console.log(`> Ready on http://${hostname}:${port}`);
    });
});
