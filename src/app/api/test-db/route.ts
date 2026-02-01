import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const users = await db.select().from(profiles);
        const safeUsers = users.map(u => ({
            id: u.id,
            username: u.username,
            email: u.email,
            hasPasswordHash: !!u.passwordHash,
            passwordHashPreview: u.passwordHash ? u.passwordHash.substring(0, 10) + '...' : 'NULL'
        }));

        return NextResponse.json({
            count: users.length,
            users: safeUsers
        });
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
