import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { channelMembers, profiles, workspaceMembers, channels } from '@/lib/db/schema';
import { eq, and, notInArray } from 'drizzle-orm';

// GET /api/channels/[channelId]/members
export async function GET(request: NextRequest, { params }: { params: { channelId: string } }) {
    const channelId = params.channelId;
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');

    try {
        // Get Channel Creator
        const [channel] = await db.select({ createdBy: channels.createdBy }).from(channels).where(eq(channels.id, channelId));

        // Get current members
        const members = await db.select({
            userId: channelMembers.userId,
            profiles: profiles
        })
            .from(channelMembers)
            .innerJoin(profiles, eq(channelMembers.userId, profiles.id))
            .where(eq(channelMembers.channelId, channelId));

        // Get non-members (workspace members not in channel) - Optimisation: fetch all workspace members and filter in code or complex join
        // Let's do a join with exclusion
        /* 
           This can be complex in one query. Simplest: Fetch all workspace members, filter out those in `members`.
        */
        let nonMembers: { userId: string, profiles: any }[] = [];
        if (workspaceId) {
            const currentMemberIds = members.map(m => m.userId);

            let query = db.select({
                userId: workspaceMembers.userId,
                profiles: profiles
            })
                .from(workspaceMembers)
                .innerJoin(profiles, eq(workspaceMembers.userId, profiles.id))
                .where(eq(workspaceMembers.workspaceId, workspaceId));

            const allWorkspaceMembers = await query;
            nonMembers = allWorkspaceMembers.filter(wm => !currentMemberIds.includes(wm.userId));
        }

        return NextResponse.json({
            members: members.map(m => m.profiles),
            nonMembers: nonMembers.map(m => m.profiles),
            creatorId: channel?.createdBy
        });

    } catch (error: any) {
        console.error("Fetch members error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST /api/channels/[channelId]/members - Add member
export async function POST(request: NextRequest, { params }: { params: { channelId: string } }) {
    try {
        const body = await request.json();
        const { userId } = body;

        if (!userId) return NextResponse.json({ error: 'User ID required' }, { status: 400 });

        await db.insert(channelMembers).values({
            channelId: params.channelId,
            userId,
            role: 'member'
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE /api/channels/[channelId]/members - Remove member
export async function DELETE(request: NextRequest, { params }: { params: { channelId: string } }) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) return NextResponse.json({ error: 'User ID required' }, { status: 400 });

        await db.delete(channelMembers)
            .where(and(
                eq(channelMembers.channelId, params.channelId),
                eq(channelMembers.userId, userId)
            ));

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
