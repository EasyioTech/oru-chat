import { hash, compare } from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { NextRequest } from 'next/server';


function getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET is not defined');
    }
    return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string): Promise<string> {
    return hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return compare(password, hash);
}

export async function signToken(payload: Record<string, unknown>): Promise<string> {
    return new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(getJwtSecret());
}

export async function verifyToken(token: string) {
    try {
        const { payload } = await jwtVerify(token, getJwtSecret());
        return payload;
    } catch (error) {
        return null;
    }
}

export async function verifyAuth(request: NextRequest) {
    const token = request.cookies.get('session')?.value;
    if (!token) {
        return null;
    }
    return await verifyToken(token);
}
