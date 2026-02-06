"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useSocket } from "@/components/SocketProvider";
import { useAuth } from "@/components/AuthProvider";

export function useTypingIndicator(workspaceId: string, channelId?: string, recipientId?: string) {
  const [typingUsers, setTypingUsers] = useState<Array<{ id: string; full_name?: string; username?: string }>>([]);
  const { subscribe, unsubscribe, isConnected, client } = useSocket();
  const { user } = useAuth();
  const typingTimeouts = useRef<Record<string, NodeJS.Timeout>>({});

  // Listen for typing events using Centrifuge subscriptions
  useEffect(() => {
    if (!isConnected || !subscribe) return;

    // Determine the channel to subscribe to
    const typingChannel = channelId
      ? `workspace:${workspaceId}:channel:${channelId}:typing`
      : recipientId
        ? `workspace:${workspaceId}:dm:${recipientId}:typing`
        : null;

    if (!typingChannel) return;

    const handleUserTyping = (data: { username: string; userId?: string }) => {
      const { username, userId } = data;

      // Don't show own typing
      if (username === user?.username || userId === user?.id) return;

      setTypingUsers(prev => {
        if (prev.some(u => u.username === username)) return prev;
        return [...prev, { id: userId || username, username, full_name: username }];
      });

      // Auto-remove typing indicator after 3 seconds
      if (typingTimeouts.current[username]) {
        clearTimeout(typingTimeouts.current[username]);
      }

      typingTimeouts.current[username] = setTimeout(() => {
        setTypingUsers(prev => prev.filter(u => u.username !== username));
        delete typingTimeouts.current[username];
      }, 3000);
    };

    const subscription = subscribe(typingChannel, handleUserTyping);

    return () => {
      if (typingChannel) {
        unsubscribe(typingChannel);
      }
      // Clear all timeouts
      Object.values(typingTimeouts.current).forEach(clearTimeout);
      typingTimeouts.current = {};
    };
  }, [subscribe, unsubscribe, isConnected, workspaceId, channelId, recipientId, user?.username, user?.id]);

  const handleTyping = useCallback(async () => {
    if (!isConnected || !user) return;

    // Publish typing event via backend API
    try {
      await fetch('/api/realtime/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          channel: channelId
            ? `workspace:${workspaceId}:channel:${channelId}:typing`
            : recipientId
              ? `workspace:${workspaceId}:dm:${recipientId}:typing`
              : null,
          data: {
            username: user.username,
            userId: user.id,
          },
        }),
      });
    } catch (error) {
      console.error('[TypingIndicator] Failed to publish typing event:', error);
    }
  }, [isConnected, workspaceId, channelId, recipientId, user]);

  const stopTyping = useCallback(() => {
    // Optional: could publish stop_typing event
    // For now, we rely on the 3-second timeout
  }, []);

  return {
    typingUsers,
    handleTyping,
    stopTyping,
  };
}
