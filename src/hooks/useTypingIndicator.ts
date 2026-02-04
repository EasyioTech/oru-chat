"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useSocket } from "@/components/SocketProvider";
import { useAuth } from "@/components/AuthProvider";

export function useTypingIndicator(workspaceId: string, channelId?: string, recipientId?: string) {
  const [typingUsers, setTypingUsers] = useState<Array<{ id: string; full_name?: string; username?: string }>>([]);
  const { socket, isConnected } = useSocket();
  const { user } = useAuth();
  const typingTimeouts = useRef<Record<string, NodeJS.Timeout>>({});

  // Listen for typing events
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleUserTyping = ({ channelId: typingChannelId, username }: { channelId?: string, username: string }) => {
      // Only show typing if it's for the current channel/conversation
      if (channelId && typingChannelId !== channelId) return;

      // Don't show own typing
      if (username === user?.username) return;

      setTypingUsers(prev => {
        if (prev.some(u => u.username === username)) return prev;
        return [...prev, { id: username, username, full_name: username }];
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

    socket.on('user_typing', handleUserTyping);

    return () => {
      socket.off('user_typing', handleUserTyping);
      // Clear all timeouts
      Object.values(typingTimeouts.current).forEach(clearTimeout);
      typingTimeouts.current = {};
    };
  }, [socket, isConnected, channelId, user?.username]);

  const handleTyping = useCallback(() => {
    if (!socket || !isConnected || !user) return;

    socket.emit('typing', {
      workspaceId,
      channelId,
      recipientId,
      username: user.username
    });
  }, [socket, isConnected, workspaceId, channelId, recipientId, user]);

  const stopTyping = useCallback(() => {
    // Optional: could emit stop_typing event
    // For now, we rely on the 3-second timeout
  }, []);

  return {
    typingUsers,
    handleTyping,
    stopTyping,
  };
}
