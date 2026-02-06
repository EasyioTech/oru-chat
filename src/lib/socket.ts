/**
 * Centrifugo Publishing API
 * Drop-in replacement for Socket.IO Redis Emitter
 */

const CENTRIFUGO_API_URL = process.env.CENTRIFUGO_API_URL || "http://centrifugo:8000/api";
const CENTRIFUGO_API_KEY = process.env.CENTRIFUGO_API_KEY || "";

/**
 * Publish a message to Centrifugo via its HTTP API
 * This replaces the Socket.IO Redis Emitter pattern
 */
async function publishToCentrifugo(channel: string, data: unknown) {
    try {
        const response = await fetch(`${CENTRIFUGO_API_URL}/publish`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `apikey ${CENTRIFUGO_API_KEY}`,
            },
            body: JSON.stringify({ channel, data }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Centrifugo API error (${response.status}): ${errorText}`);
        }

        console.log(`[Centrifugo] Published to channel: ${channel}`);
    } catch (error) {
        console.error(`[Centrifugo] Failed to publish to ${channel}:`, error);
        throw error; // Re-throw so API routes can handle errors
    }
}

// INTERFACE PARITY: Drop-in replacements for existing Socket.IO functions
export async function emitToChannel(channelId: string, event: string, data: unknown) {
    if (!channelId) return;
    const channel = `channel:${channelId}`;
    await publishToCentrifugo(channel, { event, data });
}

export async function emitToWorkspace(workspaceId: string, event: string, data: unknown) {
    if (!workspaceId) return;
    const channel = `workspace:${workspaceId}`;
    await publishToCentrifugo(channel, { event, data });
}

export async function emitToUser(userId: string, event: string, data: unknown) {
    if (!userId) return;
    const channel = `user:${userId}`;
    await publishToCentrifugo(channel, { event, data });
}
