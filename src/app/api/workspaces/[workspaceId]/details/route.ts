import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';
import { workspaces, channels, channelMembers, workspaceMembers, profiles, memberLastRead } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Verify token
  const payload = await verifyToken(token);
  if (!payload || !payload.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = payload.sub as string;

  try {
    // 1. Fetch workspace
    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // 2. Fetch all channels
    const allChannels = await db
      .select()
      .from(channels)
      .where(eq(channels.workspaceId, workspaceId))
      .orderBy(channels.name);

    // 3. Fetch user's channel memberships
    const userMemberships = await db
      .select({ channelId: channelMembers.channelId })
      .from(channelMembers)
      .where(eq(channelMembers.userId, userId));

    const memberChannelIds = new Set(userMemberships.map(m => m.channelId));

    // 4. Filter channels
    const filteredChannels = allChannels.filter(c => !c.isPrivate || memberChannelIds.has(c.id));

    // 5. Fetch members
    const membersData = await db
      .select({
        profile: profiles
      })
      .from(workspaceMembers)
      .leftJoin(profiles, eq(workspaceMembers.userId, profiles.id))
      .where(eq(workspaceMembers.workspaceId, workspaceId));

    const validMembers = membersData
      .map(m => m.profile)
      .filter((p): p is typeof profiles.$inferSelect => !!p && p.id !== userId)
      .map(p => ({
        id: p.id,
        full_name: p.fullName,
        username: p.username,
        avatar_url: p.avatarUrl,
        status_text: p.statusText,
        status_emoji: p.statusEmoji,
        badge: p.badge,
        // Include raw Drizzle fields just in case other parts need them, or cleaner to just spread? 
        // Frontend explicitly uses snake_case, so explicit mapping is safer.
      }));

    // 6. Unread Counts (Simplified Logic)
    const lastReads = await db
      .select()
      .from(memberLastRead)
      .where(and(eq(memberLastRead.userId, userId), eq(memberLastRead.workspaceId, workspaceId)));

    // Placeholder for unread counts logic
    const unreadCounts: any[] = [];

    return NextResponse.json({
      workspace,
      channels: filteredChannels,
      members: validMembers,
      unreadCounts: unreadCounts
    });

  } catch (error: any) {
    console.error("Workspace details error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
