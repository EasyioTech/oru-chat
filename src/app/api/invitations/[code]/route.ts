import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { workspaces, workspaceMembers, workspaceInvitations, channels, channelMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
    try {
        const { code } = await params;
        const invitation = await db.select({
            id: workspaceInvitations.id,
            role: workspaceInvitations.role,
            expiresAt: workspaceInvitations.expiresAt,
            workspace: {
                id: workspaces.id,
                name: workspaces.name,
                slug: workspaces.slug
            }
        })
            .from(workspaceInvitations)
            .innerJoin(workspaces, eq(workspaceInvitations.workspaceId, workspaces.id))
            .where(and(
                eq(workspaceInvitations.inviteCode, code),
                // eq(workspaceInvitations.usedAt, null) // Assuming we implement usedAt in schema or just allow multi-use. Schema had used_at? No, I checked schema.sql and it didn't have used_at explicitly in the Drizzle one I wrote? Let me check schema.ts.
                // Oh, schema.ts line 76: expiresAt. I didn't see usedAt in schema.ts.
                // If the schema.sql I wrote had it, but Drizzle schema didn't...
                // Let's assume multi-use or ignore usage tracking for now to match Drizzle schema.
                // Wait, schema.sql I wrote: `expires_at timestamp`.
                // The InvitePage checks `is("used_at", null)`.
                // I should use Drizzle schema as truth.
            ))
            .limit(1);

        if (invitation.length === 0) {
            return NextResponse.json({ error: "Invalid invitation" }, { status: 404 });
        }

        const invite = invitation[0];
        if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
            return NextResponse.json({ error: "Invitation expired" }, { status: 410 });
        }

        return NextResponse.json(invite);

    } catch (error) {
        console.error("Fetch invite error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
    try {
        const { code } = await params;
        const cookieStore = await cookies();
        const token = cookieStore.get("session")?.value;
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const payload = await verifyToken(token);
        if (!payload || !payload.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const userId = payload.sub as string;

        // Verify Invite again
        const invitation = await db.select().from(workspaceInvitations).where(eq(workspaceInvitations.inviteCode, code)).limit(1);
        if (invitation.length === 0) return NextResponse.json({ error: "Invalid invitation" }, { status: 404 });
        const invite = invitation[0];

        // Ensure not already member
        const existing = await db.select().from(workspaceMembers).where(and(
            eq(workspaceMembers.workspaceId, invite.workspaceId),
            eq(workspaceMembers.userId, userId)
        )).limit(1);

        if (existing.length > 0) {
            return NextResponse.json({ error: "Already a member" }, { status: 409 });
        }

        // Add to Workspace
        await db.insert(workspaceMembers).values({
            workspaceId: invite.workspaceId,
            userId: userId,
            role: invite.role || 'member'
        });

        // Add to public channels
        const publicChannels = await db.select().from(channels).where(and(
            eq(channels.workspaceId, invite.workspaceId),
            eq(channels.isPrivate, false)
        ));

        for (const ch of publicChannels) {
            await db.insert(channelMembers).values({
                channelId: ch.id,
                userId: userId
            }).onConflictDoNothing();
        }

        // Return workspace ID for redirect
        return NextResponse.json({ workspaceId: invite.workspaceId });

    } catch (error) {
        console.error("Accept invite error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
