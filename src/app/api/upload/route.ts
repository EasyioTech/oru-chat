import { NextRequest, NextResponse } from 'next/server';
import { r2, R2_BUCKET_NAME } from '@/lib/r2';
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
    try {
        // Authenticate
        const cookieStore = await cookies();
        const token = cookieStore.get("session")?.value;
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const payload = await verifyToken(token);
        if (!payload || !payload.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const userId = payload.sub as string;

        const data = await request.formData();
        const file: File | null = data.get('file') as unknown as File;
        const workspaceId = data.get('workspaceId') as string;
        const channelId = data.get('channelId') as string | null;
        const recipientId = data.get('recipientId') as string | null;

        if (!file || !workspaceId) {
            return NextResponse.json({ error: 'Missing file or workspaceId' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Construct Key for Isolation
        // Structure: workspaces/{wsId}/{context}/{id}/{filename}
        let key = "";
        const timestamp = Date.now();
        const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '');

        if (channelId) {
            key = `workspaces/${workspaceId}/channels/${channelId}/${timestamp}-${sanitizedFilename}`;
        } else if (recipientId) {
            // Sort IDs to ensure consistent DM path regardless of sender
            const participants = [userId, recipientId].sort().join('-');
            key = `workspaces/${workspaceId}/dms/${participants}/${timestamp}-${sanitizedFilename}`;
        } else {
            // Fallback for generic workspace files (e.g. avatar?)
            key = `workspaces/${workspaceId}/general/${userId}/${timestamp}-${sanitizedFilename}`;
        }

        await r2.send(new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
            Body: buffer,
            ContentType: file.type,
        }));

        // Return Proxy URL for secure access
        // The client will use /api/files?key=...
        const publicUrl = `/api/files?key=${encodeURIComponent(key)}`;

        return NextResponse.json({ url: publicUrl, name: file.name, type: file.type, size: file.size });

    } catch (error: any) {
        console.error("Upload error:", error);
        return NextResponse.json({ error: 'Upload failed: ' + error.message }, { status: 500 });
    }
}
