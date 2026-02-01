
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { reactions, messages } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { emitToChannel, emitToUser } from '@/lib/socket';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ messageId: string }> }
) {
    try {
        const { messageId } = await params;
        const { userId, emoji } = await request.json();

        if (!messageId || !userId || !emoji) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Check if reaction exists
        const existingReaction = await db
            .select()
            .from(reactions)
            .where(and(
                eq(reactions.messageId, messageId),
                eq(reactions.userId, userId),
                eq(reactions.emoji, emoji)
            ))
            .limit(1);

        let action = 'added';

        if (existingReaction.length > 0) {
            // Remove
            await db.delete(reactions)
                .where(and(
                    eq(reactions.messageId, messageId),
                    eq(reactions.userId, userId),
                    eq(reactions.emoji, emoji)
                ));
            action = 'removed';
        } else {
            // Add
            await db.insert(reactions).values({
                messageId,
                userId,
                emoji
            });
        }

        // Fetch message to get channel/recipient for broadcasting
        const [message] = await db.select().from(messages).where(eq(messages.id, messageId)).limit(1);

        if (message) {
            const socketPayload = {
                messageId,
                reaction: { emoji, user_id: userId },
                action
            };

            if (message.channelId) {
                await emitToChannel(message.channelId, "reaction_updated", socketPayload);
            } else if (message.recipientId) {
                await emitToUser(message.recipientId, "reaction_updated", socketPayload);
                await emitToUser(message.senderId!, "reaction_updated", socketPayload);
            }
        }

        return NextResponse.json({ success: true, action });

    } catch (error: any) {
        console.error("Reaction error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
