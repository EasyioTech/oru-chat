import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { channels, channelMembers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// POST /api/channels - Create a new channel
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, description, isPrivate, encryptionEnabled, workspaceId, userId } = body;

        // Validate inputs
        if (!name || !workspaceId || !userId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Insert channel
        const [newChannel] = await db.insert(channels).values({
            workspaceId,
            name,
            description,
            isPrivate: isPrivate || false,
            createdBy: userId,
            encryptionEnabled: encryptionEnabled || false
        }).returning();

        // Insert creator as member
        await db.insert(channelMembers).values({
            channelId: newChannel.id,
            userId: userId,
            encryptedKey: body.encryptedKey || null,
            role: 'admin' // Creator is admin
        });

        return NextResponse.json({ data: newChannel });
    } catch (error: any) {
        console.error("Create channel error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
