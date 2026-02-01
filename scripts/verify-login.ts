
import { db } from "../src/lib/db";
import { profiles } from "../src/lib/db/schema";
import { eq } from "drizzle-orm";

async function verifyLogin() {
    console.log("Starting verification...");
    const email = "user1@oruchat.com";

    try {
        console.log(`Connecting to DB to find: ${email}`);
        const result = await db
            .select()
            .from(profiles)
            .where(eq(profiles.email, email))
            .limit(1);

        console.log("DB Query returned.");

        if (!result || result.length === 0) {
            console.error("User NOT found in DB.");
            return;
        }

        const user = result[0];
        console.log(`User found: ${user.username} (ID: ${user.id})`);
        console.log(`Password Hash: ${user.passwordHash}`);

    } catch (error) {
        console.error("Error fetching user:", error);
    } finally {
        console.log("Done.");
        process.exit(0);
    }
}

verifyLogin();
