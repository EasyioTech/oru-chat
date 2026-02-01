import 'dotenv/config';
import { db } from "../db";
import { profiles, workspaces, channels, workspaceMembers, channelMembers } from "./schema";
import { hashPassword } from "../auth";

async function main() {
    console.log("Seeding database...");

    const passwordHash = await hashPassword("password123");

    // 1. Create Demo Users
    const users = [];
    for (let i = 1; i <= 5; i++) {
        const [user] = await db.insert(profiles).values({
            fullName: `User ${i}`,
            username: `user${i}`,
            email: `user${i}@oruchat.com`, // Fixed domain to match UI hint
            passwordHash,
            statusText: "Ready to chat",
            statusEmoji: "👋",
        }).returning();
        users.push(user);
        console.log(`Created user: ${user.email}`);
    }

    // 2. Create Default Workspace
    const [workspace] = await db.insert(workspaces).values({
        name: "General Workspace",
        slug: "general-workspace",
        ownerId: users[0].id,
    }).returning();
    console.log(`Created workspace: ${workspace.name}`);

    // 3. Create General Channel
    const [channel] = await db.insert(channels).values({
        workspaceId: workspace.id,
        name: "general",
        createdBy: users[0].id,
    }).returning();
    console.log(`Created channel: ${channel.name}`);

    // 4. Add users to workspace and channel
    for (const user of users) {
        await db.insert(workspaceMembers).values({
            workspaceId: workspace.id,
            userId: user.id,
            role: user.id === users[0].id ? "admin" : "member"
        });
        await db.insert(channelMembers).values({
            channelId: channel.id,
            userId: user.id,
            role: user.id === users[0].id ? "admin" : "member"
        });
    }

    console.log("Seeding complete!");
    process.exit(0);
}

main().catch((err) => {
    console.error("Seeding failed:", err);
    process.exit(1);
});
