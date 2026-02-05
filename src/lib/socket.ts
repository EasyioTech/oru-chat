import { Emitter } from "@socket.io/redis-emitter";
import { Redis } from "ioredis";

let emitterInstance: Emitter | null = null;
let redisClient: Redis | null = null;

// Lazy-load the emitter to avoid connection during build time
function getEmitter(): Emitter {
    if (!emitterInstance) {
        const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
        redisClient = new Redis(redisUrl);

        // Add connection error handling
        redisClient.on('error', (err) => {
            console.error('[Redis Emitter] Connection error:', err.message);
        });

        redisClient.on('connect', () => {
            console.log('[Redis Emitter] Connected to Redis:', redisUrl);
        });

        emitterInstance = new Emitter(redisClient);
    }
    return emitterInstance;
}

// Helper to standardise event emission
export async function emitToChannel(channelId: string, event: string, data: unknown) {
    if (!channelId) return;
    try {
        const io = getEmitter();
        io.to(`channel:${channelId}`).emit(event, data);
        console.log(`[Socket] Emitted ${event} to channel:${channelId}`);
    } catch (error) {
        console.error(`[Socket] Failed to emit ${event} to channel:${channelId}:`, error);
    }
}

export async function emitToWorkspace(workspaceId: string, event: string, data: unknown) {
    if (!workspaceId) return;
    try {
        const io = getEmitter();
        io.to(`workspace:${workspaceId}`).emit(event, data);
        console.log(`[Socket] Emitted ${event} to workspace:${workspaceId}`);
    } catch (error) {
        console.error(`[Socket] Failed to emit ${event} to workspace:${workspaceId}:`, error);
    }
}

export async function emitToUser(userId: string, event: string, data: unknown) {
    if (!userId) return;
    try {
        const io = getEmitter();
        io.to(`user:${userId}`).emit(event, data);
        console.log(`[Socket] Emitted ${event} to user:${userId}`);
    } catch (error) {
        console.error(`[Socket] Failed to emit ${event} to user:${userId}:`, error);
    }
}
