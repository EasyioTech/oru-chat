import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { workspaceInvitations } from '@/lib/db/schema';

// POST /api/workspaces/[workspaceId]/invite
export async function POST(request: NextRequest, { params }: { params: Promise<{ workspaceId: string }> }) {
    const { workspaceId } = await params;
    try {
        const body = await request.json();
        const { email, inviteCode, role, createdBy } = body;

        // We can also generate inviteCode here if not provided, but the dialog sends it.

        await db.insert(workspaceInvitations).values({
            workspaceId,
            email: email || null,
            inviteCode,
            role: role || 'member',
            createdBy
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Invite error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
