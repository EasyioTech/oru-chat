import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { messages, profiles, reactions } from '@/lib/db/schema';
import { eq, and, or, asc, desc, aliasedTable, sql } from 'drizzle-orm';
import { emitToChannel, emitToUser } from '@/lib/socket';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');
    const channelId = searchParams.get('channelId');
    const recipientId = searchParams.get('recipientId');
    const userId = searchParams.get('userId'); // Current user ID for DM queries

    if (!workspaceId) {
        return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 });
    }

    try {
        const parentMessage = aliasedTable(messages, "parent_message");
        const parentSender = aliasedTable(profiles, "parent_sender");

        // Build WHERE clause based on query type
        let whereClause;
        if (channelId) {
            whereClause = and(
                eq(messages.workspaceId, workspaceId),
                eq(messages.channelId, channelId)
            );
        } else if (recipientId && userId) {
            whereClause = and(
                eq(messages.workspaceId, workspaceId),
                or(
                    and(eq(messages.senderId, userId), eq(messages.recipientId, recipientId)),
                    and(eq(messages.senderId, recipientId), eq(messages.recipientId, userId))
                )
            );
        } else {
            return NextResponse.json({ data: [] }); // Must provide channel or recipient
        }

        // Optimized query: fetch messages with reactions aggregated in single query
        // This eliminates the N+1 query problem
        const rows = await db
            .select({
                message: messages,
                sender: profiles,
                parentContent: parentMessage.content,
                parentSenderFullName: parentSender.fullName,
                parentSenderUsername: parentSender.username,
                // Aggregate reactions using PostgreSQL json_agg
                reactions: sql<any[]>`
COALESCE(
    json_agg(
        json_build_object(
            'emoji', ${reactions.emoji},
            'user_id', ${reactions.userId}
        )
    ) FILTER(WHERE ${reactions.id} IS NOT NULL),
    '[]':: json
)
                `
            })
            .from(messages)
            .leftJoin(profiles, eq(messages.senderId, profiles.id))
            .leftJoin(parentMessage, eq(messages.parentId, parentMessage.id))
            .leftJoin(parentSender, eq(parentMessage.senderId, parentSender.id))
            .leftJoin(reactions, eq(reactions.messageId, messages.id))
            .where(whereClause)
            .groupBy(
                messages.id,
                profiles.id,
                profiles.fullName,
                profiles.username,
                profiles.avatarUrl,
                profiles.badge,
                parentMessage.id,
                parentMessage.content,
                parentSender.id,
                parentSender.fullName,
                parentSender.username
            )
            .orderBy(asc(messages.createdAt)) as any[]; // Type cast for complex aggregation query

        return NextResponse.json({
            data: rows.map(r => ({
                id: r.message.id,
                content: r.message.content,
                created_at: r.message.createdAt,
                workspace_id: r.message.workspaceId,
                channel_id: r.message.channelId,
                recipient_id: r.message.recipientId,
                sender_id: r.message.senderId,
                parent_id: r.message.parentId,
                is_edited: r.message.isEdited,
                is_encrypted: r.message.isEncrypted,
                payload: r.message.payload,
                sender: r.sender ? {
                    id: r.sender.id,
                    full_name: r.sender.fullName,
                    username: r.sender.username,
                    avatar_url: r.sender.avatarUrl,
                    badge: r.sender.badge
                } : null,
                parent_message: r.parentContent ? {
                    content: r.parentContent,
                    sender: {
                        full_name: r.parentSenderFullName,
                        username: r.parentSenderUsername
                    }
                } : null,
                reactions: r.reactions || []
            }))
        });

    } catch (error: any) {
        console.error('Error fetching messages:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        // Validate session and extract userId from validated token
        const session = await require('@/middleware/auth').validateSession(request);

        if (!session.authenticated || !session.userId) {
            return NextResponse.json(
                { error: 'Unauthorized - Please log in' },
                { status: 401 }
            );
        }

        const senderId = session.userId; // Server-side validated user ID

        const body = await request.json();
        const { workspaceId, channelId, recipientId, content, parentId } = body;

        if (!workspaceId || !content) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const [newMessage] = await db.insert(messages).values({
            workspaceId,
            channelId,
            recipientId,
            senderId, // From validated session, not client
            content,
            parentId,
            payload: body.payload || {}
        }).returning();

        // Fetch sender details for response
        const [sender] = await db.select().from(profiles).where(eq(profiles.id, senderId));

        const formattedSender = sender ? {
            id: sender.id,
            full_name: sender.fullName,
            username: sender.username,
            avatar_url: sender.avatarUrl,
            badge: sender.badge
        } : null;

        const payload = {
            ...newMessage,
            sender: formattedSender,
            reactions: []
        };

        if (channelId) {
            await emitToChannel(channelId, "new_message", payload);
        } else if (recipientId) {
            await emitToUser(recipientId, "new_message", payload);
            await emitToUser(senderId, "new_message", payload);
        }

        return NextResponse.json({
            data: payload
        });

    } catch (error: any) {
        console.error("Message creation error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
