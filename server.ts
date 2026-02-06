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

    // Authentication Middleware - TEMPORARILY BYPASSED FOR TESTING
    io.use(async (socket, next) => {
        console.log("[Socket Auth] Connection attempt - AUTH BYPASSED FOR TESTING");
        // Temporarily skip all auth checks to test basic connectivity
        next();
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
