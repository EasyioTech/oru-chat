
import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Migrating database: Creating reactions table...");
    try {
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS public.reactions (
                id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                message_id uuid REFERENCES public.messages(id) ON DELETE CASCADE,
                user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
                emoji text NOT NULL,
                created_at timestamp with time zone DEFAULT now(),
                UNIQUE(message_id, user_id, emoji)
            );
        `);
        console.log("Reactions table created successfully.");
    } catch (e) {
        console.error("Migration failed:", e);
    }
    process.exit(0);
}

main();
