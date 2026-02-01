
import { db } from "../src/lib/db";
import { profiles } from "../src/lib/db/schema";
import { eq } from "drizzle-orm";
import { hash } from "bcryptjs";

async function fixUser() {
    console.log("Starting manual password fix for user1...");

    try {
        const hashedPassword = await hash("password", 10);
        console.log(`Generated new hash: ${hashedPassword}`);

        console.log("Updating database...");
        await db.update(profiles)
            .set({ passwordHash: hashedPassword })
            .where(eq(profiles.email, 'user1@oruchat.com'));

        console.log("Password updated successfully!");

        // Verify
        const [user] = await db.select().from(profiles).where(eq(profiles.email, 'user1@oruchat.com'));
        console.log(`Verification - New stored hash starts with: ${user?.passwordHash?.substring(0, 10)}`);

    } catch (error) {
        console.error("Error updating user:", error);
    } finally {
        console.log("Exiting...");
        process.exit(0);
    }
}

fixUser();
