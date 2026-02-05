import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify, type JWTPayload } from 'jose';

export interface AuthSession {
    authenticated: boolean;
    userId: string | null;
    user?: JWTPayload;
}

/**
 * Validates JWT session token from cookies
 * Returns authentication status and user ID
 */
export async function validateSession(request: NextRequest): Promise<AuthSession> {
    const session = request.cookies.get('session');
    console.log('[Auth Debug] Middleware checking cookies. Session cookie:', session ? 'PRESENT' : 'MISSING', 'Value:', session?.value?.substring(0, 10) + '...');
    const token = session?.value;

    if (!token) {
        return { authenticated: false, userId: null };
    }

    try {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || '');
        const { payload } = await jwtVerify(token, secret);

        return {
            authenticated: true,
            userId: payload.userId as string,
            user: payload
        };
    } catch (error) {
        console.error('Session validation failed:', error);
        return { authenticated: false, userId: null };
    }
}

/**
 * Higher-order function to protect API routes with authentication
 * Usage: export const POST = requireAuth(async (request) => { ... });
 */
export function requireAuth(handler: (request: NextRequest & { userId: string; user: JWTPayload }) => Promise<NextResponse>) {
    return async (request: NextRequest) => {
        const session = await validateSession(request);

        if (!session.authenticated || !session.userId) {
            return NextResponse.json(
                { error: 'Unauthorized - Please log in' },
                { status: 401 }
            );
        }

        // Attach user info to request for use in handler
        const authenticatedRequest = request as NextRequest & { userId: string; user: JWTPayload };
        authenticatedRequest.userId = session.userId;
        authenticatedRequest.user = session.user!; // Safe: validated above

        return handler(authenticatedRequest);
    };
}

/**
 * Optional authentication - validates if token exists but doesn't require it
 * Useful for public endpoints that behave differently when authenticated
 */
export async function optionalAuth(request: NextRequest): Promise<AuthSession> {
    return validateSession(request);
}
