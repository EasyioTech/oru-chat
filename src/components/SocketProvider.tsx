"use client";

import { createContext, useContext, useEffect, useState, useRef } from "react";
import Centrifuge, { Subscription } from "centrifuge";
import { useAuth } from "@/components/AuthProvider";

interface RealtimeContextType {
    client: Centrifuge | null;
    isConnected: boolean;
    subscribe: (channel: string, callback: (data: any) => void) => Subscription | null;
    unsubscribe: (channel: string) => void;
}

const RealtimeContext = createContext<RealtimeContextType>({
    client: null,
    isConnected: false,
    subscribe: () => null,
    unsubscribe: () => { },
});

export const useSocket = () => {
    return useContext(RealtimeContext);
};

export function SocketProvider({ children }: { children: React.ReactNode }) {
    const [client, setClient] = useState<Centrifuge | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const subscriptions = useRef<Map<string, Subscription>>(new Map());
    const { user } = useAuth();

    useEffect(() => {
        if (!user?.id) return;

        let centrifuge: Centrifuge | null = null;

        const initializeConnection = async () => {
            try {
                // Step 1: Get connection token from backend
                const tokenResponse = await fetch("/api/realtime/token", {
                    method: "POST",
                    credentials: "include",
                });

                if (!tokenResponse.ok) {
                    throw new Error("Failed to obtain connection token");
                }

                const { token } = await tokenResponse.json();

                // Step 2: Initialize Centrifuge client
                const wsUrl = process.env.NEXT_PUBLIC_APP_URL
                    ? `${process.env.NEXT_PUBLIC_APP_URL.replace('http', 'ws')}/connection/websocket`
                    : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/connection/websocket`;

                console.log("[Centrifuge] Connecting to:", wsUrl);

                centrifuge = new Centrifuge(wsUrl, {
                    token,
                    minReconnectDelay: 1000,
                    maxReconnectDelay: 30000,
                });

                // Event handlers
                centrifuge.on("connected", (ctx) => {
                    setIsConnected(true);
                    console.log("[Centrifuge] ✅ Connected:", ctx.client);
                });

                centrifuge.on("disconnected", (ctx) => {
                    setIsConnected(false);
                    console.log("[Centrifuge] ❌ Disconnected:", ctx.reason);
                });

                centrifuge.on("error", (ctx) => {
                    console.error("[Centrifuge] ❌ Error:", ctx.error);
                });

                // Connect
                centrifuge.connect();
                setClient(centrifuge);

            } catch (error) {
                console.error("[Centrifuge] Initialization failed:", error);
            }
        };

        initializeConnection();

        return () => {
            console.log("[Centrifuge] Cleaning up connection");
            subscriptions.current.forEach((sub) => sub.unsubscribe());
            subscriptions.current.clear();
            centrifuge?.disconnect();
        };
    }, [user?.id]);

    const subscribe = (channel: string, callback: (data: any) => void): Subscription | null => {
        if (!client) {
            console.warn("[Centrifuge] Cannot subscribe: client not initialized");
            return null;
        }

        // Avoid duplicate subscriptions
        if (subscriptions.current.has(channel)) {
            console.log("[Centrifuge] Already subscribed to:", channel);
            return subscriptions.current.get(channel)!;
        }

        const sub = client.newSubscription(channel);

        sub.on("publication", (ctx) => {
            console.log("[Centrifuge] Message received on", channel, ctx.data);
            callback(ctx.data);
        });

        sub.on("error", (ctx) => {
            console.error("[Centrifuge] Subscription error on", channel, ctx.error);
        });

        sub.subscribe();
        subscriptions.current.set(channel, sub);
        console.log("[Centrifuge] Subscribed to:", channel);

        return sub;
    };

    const unsubscribe = (channel: string) => {
        const sub = subscriptions.current.get(channel);
        if (sub) {
            sub.unsubscribe();
            subscriptions.current.delete(channel);
            console.log("[Centrifuge] Unsubscribed from:", channel);
        }
    };

    return (
        <RealtimeContext.Provider value={{ client, isConnected, subscribe, unsubscribe }}>
            {children}
        </RealtimeContext.Provider>
    );
}
