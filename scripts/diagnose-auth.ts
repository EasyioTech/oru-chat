#!/usr/bin/env tsx
/**
 * Script to diagnose authentication and workspace loading issues
 * Usage: npx tsx scripts/diagnose-auth.ts <API_URL> <USERNAME>
 * Example: npx tsx scripts/diagnose-auth.ts http://your-server.com user1
 */

import fetch from 'node-fetch';

const API_URL = process.argv[2] || 'http://localhost';
const USERNAME = process.argv[3] || 'user1';
const PASSWORD = 'password';

async function diagnose() {
    console.log('🔍 Starting authentication diagnostics...\n');
    console.log(`API URL: ${API_URL}`);
    console.log(`Username: ${USERNAME}\n`);

    try {
        // Step 1: Login
        console.log('Step 1: Attempting login...');
        const loginRes = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: USERNAME,
                password: PASSWORD,
            }),
        });

        console.log(`  Status: ${loginRes.status} ${loginRes.statusText}`);

        const setCookieHeader = loginRes.headers.get('set-cookie');
        console.log(`  Set-Cookie header: ${setCookieHeader ? 'YES' : 'NO'}`);

        if (setCookieHeader) {
            console.log(`  Cookie details: ${setCookieHeader}`);

            // Check for secure flag
            if (setCookieHeader.includes('Secure') && API_URL.startsWith('http://')) {
                console.log(`  ⚠️  WARNING: Cookie has 'Secure' flag but you're using HTTP!`);
                console.log(`  ⚠️  Browsers will not send this cookie, causing auth to fail.`);
            }
        }

        if (!loginRes.ok) {
            const error = await loginRes.text();
            console.log(`  ❌ Login failed: ${error}`);
            return;
        }

        const loginData = await loginRes.json();
        console.log(`  ✅ Login successful`);
        console.log(`  User: ${loginData.user?.username || 'unknown'}\n`);

        // Step 2: Extract cookie for subsequent requests
        let sessionCookie = '';
        if (setCookieHeader) {
            const match = setCookieHeader.match(/session=([^;]+)/);
            if (match) {
                sessionCookie = match[1];
            }
        }

        // Step 3: Try to fetch workspaces
        console.log('Step 2: Fetching workspaces...');
        const workspacesRes = await fetch(`${API_URL}/api/workspaces`, {
            headers: {
                'Cookie': `session=${sessionCookie}`,
            },
        });

        console.log(`  Status: ${workspacesRes.status} ${workspacesRes.statusText}`);

        if (!workspacesRes.ok) {
            const error = await workspacesRes.text();
            console.log(`  ❌ Failed to fetch workspaces: ${error}`);

            if (workspacesRes.status === 401) {
                console.log(`\n🔍 DIAGNOSIS:`);
                console.log(`  The session cookie is not being sent or accepted.`);
                console.log(`  This is likely due to one of these issues:`);
                console.log(`  1. Cookie has 'Secure' flag but server uses HTTP`);
                console.log(`  2. Cookie domain/path mismatch`);
                console.log(`  3. Cookie expired immediately`);
            }
            return;
        }

        const workspaces = await workspacesRes.json();
        console.log(`  ✅ Workspaces fetched successfully`);
        console.log(`  Count: ${workspaces.length}`);

        if (workspaces.length > 0) {
            console.log(`  Workspaces:`);
            workspaces.forEach((ws: any) => {
                console.log(`    - ${ws.name} (${ws.slug})`);
            });
        }

        console.log(`\n✅ All checks passed! Authentication is working correctly.`);

    } catch (error: any) {
        console.error(`\n❌ Error during diagnostics:`, error.message);
    }
}

diagnose();
