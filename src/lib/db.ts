import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './db/schema';

// Create connection pool with optimized settings
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20, // Maximum number of connections in the pool
    min: 2, // Minimum number of idle connections
    idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
    connectionTimeoutMillis: 2000, // Fail fast if pool is exhausted
    allowExitOnIdle: true, // Allow process to exit even with idle connections
});

// Handle pool errors
pool.on('error', (err, client) => {
    console.error('Unexpected error on idle PostgreSQL client', err);
    // Don't exit process, just log the error
});

// Graceful shutdown
process.on('SIGINT', async () => {
    await pool.end();
    console.log('Database pool closed');
    process.exit(0);
});

export const db = drizzle(pool, { schema });
export { pool }; // Export for health checks and monitoring
