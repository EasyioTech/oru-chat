import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { validateSession } from "@/middleware/auth";

/**
 * POST /api/realtime/token
 * Generate a short-lived connection token for Centrifugo
 * 
 * This token is separate from the session cookie and has a shorter expiry (5 minutes)
 * for enhanced security (principle of least privilege).
 */
export async function POST(request: Request) {
    // Convert Request to NextRequest for middleware compatibility
    const nextRequest = request as any; // NextRequest extends Request

    const authResult = await validateSession(nextRequest);
    if (!authResult.authenticated || !authResult.userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET);
        const token = await new SignJWT({ sub: authResult.userId })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt()
            .setExpirationTime("5m") // Short-lived token for connection security
            .sign(secret);

        return NextResponse.json({ token });
    } catch (error) {
        console.error("[Realtime Token] Failed to generate token:", error);
        return NextResponse.json(
            { error: "Failed to generate connection token" },
            { status: 500 }
        );
    }
}
