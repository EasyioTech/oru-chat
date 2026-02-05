import { Emitter } from "@socket.io/redis-emitter";
import { Redis } from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const redisClient = new Redis(redisUrl);

// Add connection error handling
redisClient.on('error', (err) => {
    console.error('[Redis Emitter] Connection error:', err.message);
});

redisClient.on('connect', () => {
    console.log('[Redis Emitter] Connected to Redis:', redisUrl);
});

export const io = new Emitter(redisClient);

// Helper to standardise event emission
export async function emitToChannel(channelId: string, event: string, data: unknown) {
    if (!channelId) return;
    try {
        io.to(`channel:${channelId}`).emit(event, data);
        console.log(`[Socket] Emitted ${event} to channel:${channelId}`);
    } catch (error) {
        console.error(`[Socket] Failed to emit ${event} to channel:${channelId}:`, error);
    }
}

export async function emitToWorkspace(workspaceId: string, event: string, data: unknown) {
    if (!workspaceId) return;
    try {
        io.to(`workspace:${workspaceId}`).emit(event, data);
        console.log(`[Socket] Emitted ${event} to workspace:${workspaceId}`);
    } catch (error) {
        console.error(`[Socket] Failed to emit ${event} to workspace:${workspaceId}:`, error);
    }
}

export async function emitToUser(userId: string, event: string, data: unknown) {
    if (!userId) return;
    try {
        io.to(`user:${userId}`).emit(event, data);
        console.log(`[Socket] Emitted ${event} to user:${userId}`);
    } catch (error) {
        console.error(`[Socket] Failed to emit ${event} to user:${userId}:`, error);
    }
}
