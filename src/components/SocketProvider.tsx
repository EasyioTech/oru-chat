"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/components/AuthProvider";

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
    socket: null,
    isConnected: false,
});

export const useSocket = () => {
    return useContext(SocketContext);
};

export function SocketProvider({ children }: { children: React.ReactNode }) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const { user } = useAuth();

    useEffect(() => {
        // We are using custom server on same port (3000), so path defaults to /socket.io
        const socketUrl = process.env.NEXT_PUBLIC_APP_URL || "";
        console.log("[SocketProvider] Connecting to:", socketUrl || "relative path (same origin)");

        const socketInstance = io(socketUrl, {
            path: "/socket.io",
            addTrailingSlash: false,
            withCredentials: true,
            transports: ['polling', 'websocket']
        });

        socketInstance.on("connect", () => {
            setIsConnected(true);
            console.log("[SocketProvider] ✅ Socket connected:", socketInstance.id);
        });

        socketInstance.on("disconnect", (reason) => {
            setIsConnected(false);
            console.log("[SocketProvider] ❌ Socket disconnected. Reason:", reason);
        });

        socketInstance.on("connect_error", (error) => {
            console.error("[SocketProvider] ❌ Connection error:", error.message);
            console.error("[SocketProvider] Error details:", error);
        });

        socketInstance.on("connect_timeout", () => {
            console.error("[SocketProvider] ❌ Connection timeout");
        });

        socketInstance.on("reconnect_attempt", (attemptNumber) => {
            console.log("[SocketProvider] 🔄 Reconnect attempt:", attemptNumber);
        });

        console.log("[SocketProvider] Socket instance created, status:", socketInstance.connected);

        setSocket(socketInstance);

        return () => {
            console.log("[SocketProvider] Cleaning up socket connection");
            socketInstance.disconnect();
        };
    }, [user?.id]);

    return (
        <SocketContext.Provider value={{ socket, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
}
