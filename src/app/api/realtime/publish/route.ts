import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

export async function POST(request: NextRequest) {
    try {
        // Verify authentication
        const auth = await verifyAuth(request);
        if (!auth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { channel, data } = await request.json();

        if (!channel) {
            return NextResponse.json({ error: "Channel is required" }, { status: 400 });
        }

        // Publish message to Centrifugo via Redis
        await redis.publish(
            "centrifugo.api",
            JSON.stringify({
                method: "publish",
                params: {
                    channel,
                    data,
                },
            })
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[API] /api/realtime/publish error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
