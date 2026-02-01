"use client";

import { useState, useCallback } from "react";

export function useTypingIndicator(workspaceId: string, channelId?: string, recipientId?: string) {
  const [typingUsers, setTypingUsers] = useState<Array<{ id: string; full_name?: string; username?: string }>>([]);

  const handleTyping = useCallback(async () => {
    // No-op
  }, []);

  const stopTyping = useCallback(async () => {
    // No-op
  }, []);

  return {
    typingUsers,
    handleTyping,
    stopTyping,
  };
}
