// src/hooks/useSocket.js
'use client';

import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export const useSocket = (roomId) => {
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        // Connect to the WebSocket server
        const newSocket = io('http://localhost:3001');

        // Join the specified room (e.g., a gameId or lobbyId)
        if (roomId) {
            newSocket.emit('join_room', roomId);
        }

        setSocket(newSocket);

        // Disconnect on component unmount
        return () => {
            newSocket.disconnect();
        };
    }, [roomId]);

    return socket;
};