import 'dotenv/config';
import { db } from "../db";
import { profiles } from "./schema";
import { hashPassword } from "../auth";
import { eq } from "drizzle-orm";

async function main() {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.error("Usage: npx ts-node src/lib/db/reset-password.ts <email> <new_password>");
        process.exit(1);
    }

    const [email, newPassword] = args;
    console.log(`Resetting password for ${email}...`);

    const [user] = await db.select().from(profiles).where(eq(profiles.email, email)).limit(1);

    if (!user) {
        console.error(`User with email ${email} not found.`);
        console.log("Available users:");
        const users = await db.select().from(profiles);
        users.forEach(u => console.log(` - ${u.email} (${u.username})`));
        process.exit(1);
    }

    const hashedPassword = await hashPassword(newPassword);
    await db.update(profiles).set({ passwordHash: hashedPassword }).where(eq(profiles.id, user.id));

    console.log(`Password for ${email} has been updated successfully.`);
    process.exit(0);
}

main().catch((err) => {
    console.error("Error:", err);
    process.exit(1);
});
