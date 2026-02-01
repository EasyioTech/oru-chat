
process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/enterprisechat";

async function main() {
    console.log("Fixing password for user1...");
    const { hash } = require('bcryptjs');
    const { db } = require('./src/lib/db');
    const { profiles } = require('./src/lib/db/schema');
    const { eq } = require('drizzle-orm');

    const hashedPassword = await hash('password', 10);
    console.log("Generated hash:", hashedPassword);

    try {
        await db.update(profiles)
            .set({ passwordHash: hashedPassword })
            .where(eq(profiles.username, 'user1'));

        console.log("Password updated successfully for user1");
    } catch (e) {
        console.error("Error updating password:", e);
    }
    process.exit(0);
}

main();
