import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;

    if (!token) {
        return NextResponse.json({ user: null });
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.sub) {
        return NextResponse.json({ user: null });
    }

    const [user] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.id, payload.sub as string))
        .limit(1);

    if (!user) {
        return NextResponse.json({ user: null });
    }

    const { passwordHash, ...userInfo } = user;
    return NextResponse.json({
        user: {
            id: userInfo.id,
            full_name: userInfo.fullName,
            username: userInfo.username,
            email: userInfo.email,
            avatar_url: userInfo.avatarUrl,
            status_text: userInfo.statusText,
            status_emoji: userInfo.statusEmoji,
            badge: userInfo.badge,
            public_key: userInfo.publicKey
        }
    });
}
