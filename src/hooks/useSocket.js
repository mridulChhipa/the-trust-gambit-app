// src/hooks/useSocket.js
'use client';

import { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = (process.env.NEXT_PUBLIC_SOCKET_URL || '').trim();

export const useSocket = (roomId) => {
    const [socket, setSocket] = useState(null);

    const endpoint = useMemo(() => {
        if (SOCKET_URL.length === 0) {
            return undefined; // Falling back to same-origin in dev
        }
        return SOCKET_URL;
    }, []);

    useEffect(() => {
        const newSocket = io(endpoint);

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, [endpoint]);

    useEffect(() => {
        if (!socket || !roomId) {
            return;
        }

        const joinRoom = () => {
            socket.emit('join_room', roomId);
        };

        socket.on('connect', joinRoom);

        if (socket.connected) {
            joinRoom();
        }

        return () => {
            socket.off('connect', joinRoom);
        };
    }, [socket, roomId]);

    return socket;
};