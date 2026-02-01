"use client";

import { useState, useCallback } from "react";

type PresenceState = "online" | "idle" | "offline";

interface UserPresence {
  id: string;
  status: PresenceState;
  lastSeen: string;
}

export function usePresence(workspaceId: string) {
  // Mock implementation: always empty or static
  // In a real migration, this would be replaced by a Websocket provider (e.g. Socket.io / Pusher)
  const [presenceMap] = useState<Map<string, UserPresence>>(new Map());

  const updateStatus = useCallback(async (status: PresenceState) => {
    // No-op
  }, []);

  const getPresence = useCallback((userId: string): UserPresence | undefined => {
    return presenceMap.get(userId);
  }, [presenceMap]);

  const isOnline = useCallback((userId: string): boolean => {
    return false; // Always offline for now
  }, []);

  return {
    presenceMap,
    updateStatus,
    getPresence,
    isOnline,
  };
}
