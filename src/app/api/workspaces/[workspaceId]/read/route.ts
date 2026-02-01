import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { memberLastRead } from '@/lib/db/schema';
import { eq, and, isNull, isNotNull } from 'drizzle-orm';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ workspaceId: string }> }
) {
    const { workspaceId } = await params;
    const body = await request.json();
    const { userId, channelId, recipientId } = body;

    if (!userId || !workspaceId) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    try {
        // Manual upsert to handle partial unique indexes correctly
        // Find existing record
        const existingRecord = await db
            .select()
            .from(memberLastRead)
            .where(
                and(
                    eq(memberLastRead.userId, userId),
                    eq(memberLastRead.workspaceId, workspaceId),
                    channelId
                        ? and(eq(memberLastRead.channelId, channelId), isNotNull(memberLastRead.channelId))
                        : and(eq(memberLastRead.recipientId, recipientId), isNotNull(memberLastRead.recipientId))
                )
            )
            .limit(1);

        const now = new Date();

        if (existingRecord.length > 0) {
            // Update existing record
            await db
                .update(memberLastRead)
                .set({ lastReadAt: now })
                .where(eq(memberLastRead.id, existingRecord[0].id));
        } else {
            // Insert new record
            await db.insert(memberLastRead).values({
                workspaceId,
                userId,
                channelId: channelId || null,
                recipientId: recipientId || null,
                lastReadAt: now
            });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error updating last read:', error);
        console.error('Request data:', { workspaceId, userId, channelId, recipientId });
        return NextResponse.json({
            error: error.message || 'Failed to update read status',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}
