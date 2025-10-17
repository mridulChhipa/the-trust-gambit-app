import { io as createClientSocket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

export function emitServerEvent(eventName, payload) {
    return new Promise((resolve, reject) => {
        const socket = createClientSocket(SOCKET_URL, {
            transports: ['websocket'],
            forceNew: true,
            reconnection: false,
        });

        const teardown = () => {
            if (socket.connected) {
                socket.disconnect();
            }
        };

        const handleError = (err) => {
            teardown();
            reject(err instanceof Error ? err : new Error('Socket emit failed'));
        };

        socket.on('connect', () => {
            socket.emit(eventName, payload);
            setTimeout(() => {
                teardown();
                resolve();
            }, 200);
        });

        socket.on('connect_error', handleError);
        socket.on('error', handleError);
    });
}
