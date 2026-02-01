import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { messages, profiles } from '@/lib/db/schema';
import { eq, ilike, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const workspaceId = searchParams.get('workspaceId');

    if (!query || query.length < 2 || !workspaceId) {
        return NextResponse.json({ data: [] });
    }

    try {
        const results = await db
            .select({
                id: messages.id,
                content: messages.content,
                channelId: messages.channelId,
                recipientId: messages.recipientId,
                createdAt: messages.createdAt,
                sender: {
                    fullName: profiles.fullName,
                    username: profiles.username
                }
            })
            .from(messages)
            .leftJoin(profiles, eq(messages.senderId, profiles.id))
            .where(
                and(
                    eq(messages.workspaceId, workspaceId),
                    ilike(messages.content, `%${query}%`)
                )
            )
            .limit(10);

        return NextResponse.json({ data: results });
    } catch (error: any) {
        console.error("Search error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
