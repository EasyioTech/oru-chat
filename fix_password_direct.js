
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function main() {
    const client = new Client({
        connectionString: "postgresql://postgres:postgres@localhost:5432/enterprisechat"
    });

    try {
        await client.connect();
        console.log("Connected to DB");

        const hashedPassword = await bcrypt.hash('password', 10);
        console.log("Generated hash:", hashedPassword);

        const res = await client.query(
            "UPDATE profiles SET password_hash = $1 WHERE username = 'user1'",
            [hashedPassword]
        );

        console.log("Update result:", res.rowCount);
        console.log("Password updated successfully");

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.end();
    }
}

main();
