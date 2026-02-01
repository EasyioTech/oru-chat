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
        // Only connect if user is authenticated? 
        // Usually yes, but for public pages? 
        // Let's connect always but maybe ident later. 
        // Actually better to connect only when mounted.

        // We are using custom server on same port (3000), so path defaults to /socket.io
        const socketInstance = io(process.env.NEXT_PUBLIC_APP_URL || "", {
            path: "/socket.io",
            addTrailingSlash: false,
        });

        socketInstance.on("connect", () => {
            setIsConnected(true);
            console.log("Socket connected:", socketInstance.id);

            // If user is logged in, join their personal room
            if (user) {
                socketInstance.emit("join-user", user.id);
            }
        });

        socketInstance.on("disconnect", () => {
            setIsConnected(false);
            console.log("Socket disconnected");
        });

        setSocket(socketInstance);

        return () => {
            socketInstance.disconnect();
        };
    }, [user?.id]);
    // Re-connect if user changes? Usually socket is persistent, 
    // but if we want to auth the socket, we might need to send token.
    // For now, simple connection.

    return (
        <SocketContext.Provider value={{ socket, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
}
