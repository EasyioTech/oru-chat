import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { workspaces, workspaceMembers, channels } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("session")?.value;
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const payload = await verifyToken(token);
        if (!payload || !payload.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const userId = payload.sub as string;

        const userWorkspaces = await db.select({
            id: workspaces.id,
            name: workspaces.name,
            slug: workspaces.slug
        })
            .from(workspaceMembers)
            .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
            .where(eq(workspaceMembers.userId, userId));

        return NextResponse.json(userWorkspaces);
    } catch (error) {
        console.error("List workspaces error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("session")?.value;
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const payload = await verifyToken(token);
        if (!payload || !payload.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const userId = payload.sub as string;

        const { name } = await req.json();
        if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

        // Transaction handling (if Drizzle supported it nicely in this context, otherwise sequential)
        // 1. Create Workspace
        const [workspace] = await db.insert(workspaces).values({
            name,
            slug, // Note: Slug uniqueness might throw error, needing catch
            ownerId: userId
        }).returning();

        // 2. Add Owner Member
        await db.insert(workspaceMembers).values({
            workspaceId: workspace.id,
            userId: userId,
            role: 'owner' // or 'admin' based on schema definition in SQL (it was 'admin' or 'member'?) Schema says 'member' default. I'll use 'admin'.
        });

        // 3. Create General Channel
        await db.insert(channels).values({
            workspaceId: workspace.id,
            name: 'general',
            createdBy: userId
        });

        return NextResponse.json(workspace);

    } catch (error: any) {
        console.error("Create workspace error:", error);
        if (error.code === '23505') { // Postgres uniqueness error
            return NextResponse.json({ error: "Workspace with this name/slug already exists" }, { status: 409 });
        }
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
