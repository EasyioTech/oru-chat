import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { profiles, workspaceMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { emitToWorkspace } from "@/lib/socket";

export async function PATCH(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("session")?.value;

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const payload = await verifyToken(token);
        if (!payload || !payload.sub) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const userId = payload.sub as string;

        // Filter allowed fields to update
        const { fullName, username, avatarUrl, statusText, statusEmoji, badge, publicKey } = body;
        const updateData: any = {};
        if (fullName !== undefined) updateData.fullName = fullName;
        if (username !== undefined) updateData.username = username;
        if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
        if (statusText !== undefined) updateData.statusText = statusText;
        if (statusEmoji !== undefined) updateData.statusEmoji = statusEmoji;
        if (badge !== undefined) updateData.badge = badge;
        if (publicKey !== undefined) updateData.publicKey = publicKey;

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ success: true }); // Nothing to update
        }

        await db.update(profiles).set(updateData).where(eq(profiles.id, userId));

        const [updatedUser] = await db
            .select()
            .from(profiles)
            .where(eq(profiles.id, userId))
            .limit(1);

        const { passwordHash, ...userInfo } = updatedUser;

        // Fetch user's workspaces to broadcast updates
        const userWorkspaces = await db
            .select({ workspaceId: workspaceMembers.workspaceId })
            .from(workspaceMembers)
            .where(eq(workspaceMembers.userId, userId));

        // Broadcast to each workspace
        const broadcastPayload = {
            id: userInfo.id,
            full_name: userInfo.fullName,
            username: userInfo.username,
            avatar_url: userInfo.avatarUrl,
            status_text: userInfo.statusText,
            status_emoji: userInfo.statusEmoji,
            badge: userInfo.badge
        };

        await Promise.all(userWorkspaces.map(w =>
            emitToWorkspace(w.workspaceId, "user_updated", broadcastPayload)
        ));

        return NextResponse.json({ user: userInfo });

    } catch (error) {
        console.error("Update profile error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
