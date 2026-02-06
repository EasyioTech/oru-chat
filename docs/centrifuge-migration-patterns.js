// Component Migration Guide: Socket.IO → Centrifugo
// Apply these patterns to MessageList.tsx, WorkspaceSidebar.tsx, and useTypingIndicator.ts

/**
 * PATTERN 1: Basic Message Subscription
 * Use this for components that only listen to events (read-only)
 */

// ❌ OLD (Socket.IO)
import { useSocket } from "@/components/SocketProvider";

const { socket } = useSocket();

useEffect(() => {
    if (!socket || !channelId) return;

    socket.emit("join-channel", channelId);

    socket.on("new_message", (data) => {
        setMessages((prev) => [...prev, data]);
    });

    socket.on("reaction_updated", (data) => {
        // Update reaction
    });

    return () => {
        socket.off("new_message");
        socket.off("reaction_updated");
        socket.emit("leave-channel", channelId);
    };
}, [socket, channelId]);

// ✅ NEW (Centrifuge)
import { useSocket } from "@/components/SocketProvider";

const { subscribe, unsubscribe } = useSocket();

useEffect(() => {
    if (!channelId) return;

    const subscription = subscribe(`channel:${channelId}`, (message) => {
        // Single handler for all events on this channel
        if (message.event === "new_message") {
            setMessages((prev) => [...prev, message.data]);
        } else if (message.event === "reaction_updated") {
            // Update reaction using message.data
        }
    });

    return () => {
        unsubscribe(`channel:${channelId}`);
    };
}, [channelId, subscribe, unsubscribe]);


/**
 * PATTERN 2: User-Specific Subscriptions
 * Use this for components listening to user-specific events
 */

// ❌ OLD (Socket.IO)
useEffect(() => {
    if (!socket || !userId) return;

    socket.on("user_updated", (data) => {
        updateUserProfile(data);
    });

    return () => {
        socket.off("user_updated");
    };
}, [socket, userId]);

// ✅ NEW (Centrifuge)
useEffect(() => {
    if (!userId) return;

    subscribe(`user:${userId}`, (message) => {
        if (message.event === "user_updated") {
            updateUserProfile(message.data);
        }
    });

    return () => unsubscribe(`user:${userId}`);
}, [userId, subscribe, unsubscribe]);


/**
 * PATTERN 3: Multiple Channel Subscriptions
 * Use this when a component needs to listen to multiple channels
 */

// ✅ NEW (Centrifuge)
useEffect(() => {
    const channels = [`channel:${channelId}`, `workspace:${workspaceId}`];

    channels.forEach((channel) => {
        subscribe(channel, (message) => {
            // Handle message based on channel and event
            if (channel.startsWith('channel:') && message.event === "new_message") {
                handleChannelMessage(message.data);
            } else if (channel.startsWith('workspace:') && message.event === "user_updated") {
                handleWorkspaceUpdate(message.data);
            }
        });
    });

    return () => {
        channels.forEach(unsubscribe);
    };
}, [channelId, workspaceId, subscribe, unsubscribe]);


/**
 * PATTERN 4: Typing Indicators (Bidirectional)
 * Use this for features that both send and receive events
 */

// ❌ OLD (Socket.IO)
const sendTypingIndicator = () => {
    if (socket && channelId) {
        socket.emit("typing", { channelId, username });
    }
};

useEffect(() => {
    if (!socket || !channelId) return;

    socket.on("user_typing", (data) => {
        setTypingUsers((prev) => [...prev, data.username]);
    });

    return () => socket.off("user_typing");
}, [socket, channelId]);

// ✅ NEW (Centrifuge)
// Note: Client-side publish is disabled by default in Centrifugo for security.
// Use an API endpoint instead:

const sendTypingIndicator = async () => {
    if (!channelId) return;

    // Call API endpoint that uses emitToChannel internally
    await fetch("/api/typing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ channelId, username }),
    });
};

useEffect(() => {
    if (!channelId) return;

    subscribe(`channel:${channelId}`, (message) => {
        if (message.event === "user_typing") {
            setTypingUsers((prev) => [...prev, message.data.username]);

            // Clear after 3 seconds
            setTimeout(() => {
                setTypingUsers((prev) => prev.filter(u => u !== message.data.username));
            }, 3000);
        }
    });

    return () => unsubscribe(`channel:${channelId}`);
}, [channelId, subscribe, unsubscribe]);


/**
 * PATTERN 5: Reconnection Handling
 * Centrifuge handles reconnection automatically with exponential backoff.
 * If you need custom logic when connection is restored:
 */

// ✅ NEW (Centrifuge)
const { client, isConnected, subscribe, unsubscribe } = useSocket();

useEffect(() => {
    if (isConnected && channelId) {
        // Re-fetch latest messages when connection is restored
        // (Centrifugo's history feature will also replay missed messages automatically)
        refetchMessages();
    }
}, [isConnected, channelId]);


/**
 * COMPONENT-SPECIFIC MIGRATION NOTES
 */

// MessageList.tsx
// - Replace lines 115, 215, 222, 239, 261
// - Use PATTERN 1 (Basic Message Subscription)
// - Handle: new_message, reaction_updated, user_updated events

// WorkspaceSidebar.tsx
// - Replace line 121
// - Use PATTERN 2 (User-Specific Subscriptions)
// - Handle: user_updated event on workspace channel

// useTypingIndicator.ts
// - Replace line 40
// - Use PATTERN 4 (Typing Indicators)
// - Create new API endpoint: /api/typing
