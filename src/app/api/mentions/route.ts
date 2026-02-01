import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { messages, profiles, channels } from '@/lib/db/schema';
import { eq, and, desc, ilike } from 'drizzle-orm';
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

// GET /api/mentions
export async function GET(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("session")?.value;
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const payload = await verifyToken(token);
        if (!payload || !payload.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // We need the user's username to search for mentions
        const [userProfile] = await db.select({ username: profiles.username }).from(profiles).where(eq(profiles.id, payload.sub as string));

        if (!userProfile?.username) return NextResponse.json({ data: [] });

        const { searchParams } = new URL(request.url);
        const workspaceId = searchParams.get('workspaceId');

        if (!workspaceId) return NextResponse.json({ error: "Workspace ID required" }, { status: 400 });

        const data = await db.select({
            id: messages.id,
            content: messages.content,
            created_at: messages.createdAt,
            sender: {
                username: profiles.username,
                full_name: profiles.fullName
            }
        })
            .from(messages)
            .innerJoin(profiles, eq(messages.senderId, profiles.id))
            .where(and(
                eq(messages.workspaceId, workspaceId),
                ilike(messages.content, `%@${userProfile.username}%`)
            ))
            .orderBy(desc(messages.createdAt))
            .limit(20);

        return NextResponse.json({ data });

    } catch (error: any) {
        console.error("Fetch mentions error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
