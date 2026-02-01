import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { notifications, profiles } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

// GET /api/notifications
export async function GET(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("session")?.value;
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const payload = await verifyToken(token);
        if (!payload || !payload.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const userId = payload.sub as string;

        const { searchParams } = new URL(request.url);
        const workspaceId = searchParams.get('workspaceId');

        if (!workspaceId) return NextResponse.json({ error: "Workspace ID required" }, { status: 400 });

        const data = await db.select({
            id: notifications.id,
            user_id: notifications.userId,
            actor_id: notifications.actorId,
            workspace_id: notifications.workspaceId,
            channel_id: notifications.channelId,
            message_id: notifications.messageId,
            type: notifications.type,
            content: notifications.content,
            is_read: notifications.isRead,
            created_at: notifications.createdAt,
            actor: {
                username: profiles.username,
                full_name: profiles.fullName,
                avatar_url: profiles.avatarUrl
            }
        })
            .from(notifications)
            .innerJoin(profiles, eq(notifications.actorId, profiles.id))
            .where(and(
                eq(notifications.userId, userId),
                eq(notifications.workspaceId, workspaceId)
            ))
            .orderBy(desc(notifications.createdAt))
            .limit(50);

        return NextResponse.json({ data });

    } catch (error: any) {
        console.error("Fetch notifications error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PATCH /api/notifications (Mark all read)
export async function PATCH(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("session")?.value;
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const payload = await verifyToken(token);
        if (!payload || !payload.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const userId = payload.sub as string;

        const body = await request.json();
        const { workspaceId, markAllRead } = body;

        if (markAllRead && workspaceId) {
            await db.update(notifications)
                .set({ isRead: true })
                .where(and(
                    eq(notifications.userId, userId),
                    eq(notifications.workspaceId, workspaceId),
                    eq(notifications.isRead, false)
                ));
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
