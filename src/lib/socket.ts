import { Emitter } from "@socket.io/redis-emitter";
import { Redis } from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const redisClient = new Redis(redisUrl);

export const io = new Emitter(redisClient);

// Helper to standardise event emission
export async function emitToChannel(channelId: string, event: string, data: any) {
    if (!channelId) return;
    io.to(`channel:${channelId}`).emit(event, data);
}

export async function emitToWorkspace(workspaceId: string, event: string, data: any) {
    if (!workspaceId) return;
    io.to(`workspace:${workspaceId}`).emit(event, data);
}

export async function emitToUser(userId: string, event: string, data: any) {
    if (!userId) return;
    io.to(`user:${userId}`).emit(event, data);
}
