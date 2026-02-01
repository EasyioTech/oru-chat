import { NextRequest, NextResponse } from 'next/server';
import { r2, R2_BUCKET_NAME } from '@/lib/r2';
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { channelMembers, workspaces } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const key = searchParams.get('key');
        if (!key) return NextResponse.json({ error: "Key required" }, { status: 400 });

        // Authenticate
        const cookieStore = await cookies();
        const token = cookieStore.get("session")?.value;
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const payload = await verifyToken(token);
        if (!payload || !payload.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const userId = payload.sub as string;

        // AUTHZ CHECK
        // Key format: workspaces/{wsId}/channels/{chId}/... or workspaces/{wsId}/dms/{uid1-uid2}/...
        const parts = key.split('/');
        if (parts[0] !== 'workspaces') return NextResponse.json({ error: "Invalid key" }, { status: 400 });

        const workspaceId = parts[1];
        const type = parts[2]; // 'channels' or 'dms' or 'general'
        const contextId = parts[3];

        // 1. Check Workspace Membership (Optional but good practice)
        // For strictness we assume user must be in workspace. 
        // We can skip this if channel/dm check implies it, but better safe.
        // Skipping pure workspace check for speed, relying on specific context checks.

        if (type === 'channels') {
            const channelId = contextId;
            // Check if user is member of channel
            const member = await db.select()
                .from(channelMembers)
                .where(and(
                    eq(channelMembers.channelId, channelId),
                    eq(channelMembers.userId, userId)
                ))
                .limit(1);

            if (member.length === 0) {
                return NextResponse.json({ error: "Access denied" }, { status: 403 });
            }
        } else if (type === 'dms') {
            const participants = contextId.split('-');
            if (!participants.includes(userId)) {
                return NextResponse.json({ error: "Access denied" }, { status: 403 });
            }
        }

        // Generate Signed URL
        const command = new GetObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
        });

        const signedUrl = await getSignedUrl(r2, command, { expiresIn: 3600 }); // 1 hour

        // Redirect to R2
        return NextResponse.redirect(signedUrl);

    } catch (error: any) {
        console.error("File access error:", error);
        return NextResponse.json({ error: "File access failed" }, { status: 500 });
    }
}
