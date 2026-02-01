
import fs from 'fs';
import path from 'path';

// Load .env manually
if (!process.env.DATABASE_URL) {
    try {
        const envPath = path.resolve(__dirname, '.env');
        if (fs.existsSync(envPath)) {
            const envConfig = fs.readFileSync(envPath, 'utf-8');
            envConfig.split('\n').forEach(line => {
                const parts = line.split('=');
                if (parts.length >= 2) {
                    const key = parts[0].trim();
                    const value = parts.slice(1).join('=').trim();
                    if (key && value && !key.startsWith('#')) {
                        process.env[key] = value;
                    }
                }
            });
            console.log("Loaded .env file");
        }
    } catch (e) {
        console.error("Error loading .env", e);
    }
}

import { db } from "./src/lib/db";
import { profiles } from "./src/lib/db/schema";
import { eq } from "drizzle-orm";

async function main() {
    console.log("Fetching users...");
    try {
        const users = await db.select().from(profiles);
        console.log(`Found ${users.length} users.`);
        users.forEach(u => {
            console.log(`User: ${u.username} (${u.email})`);
            console.log(`  ID: ${u.id}`);
            console.log(`  Has Password Hash: ${!!u.passwordHash}`);
            if (u.passwordHash) {
                console.log(`  Password Hash Preview: ${u.passwordHash.substring(0, 15)}...`);
            } else {
                console.log(`  Password Hash: NULL`);
            }
        });

        if (users.length === 0) {
            console.log("No users found. This might be why login fails!");
        }
    } catch (err) {
        console.error("Error fetching users:", err);
    }
    process.exit(0);
}

main();
