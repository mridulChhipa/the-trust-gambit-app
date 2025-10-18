// server.js
const { Server } = require("socket.io");

const PORT = Number(process.env.PORT || process.env.SOCKET_PORT || 3001);
const allowedOriginsEnv = process.env.SOCKET_ALLOWED_ORIGINS || "http://localhost:3000";
const allowedOrigins = allowedOriginsEnv
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const corsOrigin = allowedOrigins.length > 0 ? allowedOrigins : "*";
const corsConfig = {
    origin: corsOrigin,
    methods: ["GET", "POST"],
};

if (corsOrigin !== "*") {
    corsConfig.credentials = true;
}

const io = new Server(PORT, {
    cors: corsConfig,
});

console.log(`🚀 Real-time server started on port ${PORT}`);

io.on("connection", (socket) => {
    console.log(`✅ User connected: ${socket.id}`);

    // --- ROOM & LOBBY MANAGEMENT ---
    socket.on('join_room', (roomId) => {
        console.log(`User ${socket.id} joining room ${roomId}`);
        socket.join(roomId);
    });

    // --- ADMIN ACTIONS ---
    socket.on('admin:start_game', ({ gameId, firstRoundData }) => {
        // Broadcast the first round data to all players in that game's "room"
        io.to(gameId).emit('game:started');
        io.to(gameId).emit('game:new_round', firstRoundData);
        console.log(`Admin started game ${gameId}. Broadcasting round 1.`);
    });

    socket.on('admin:end_round', ({ gameId, resultsData, nextRoundData }) => {
        // Broadcast the results of the round that just ended
        io.to(gameId).emit('game:round_results', resultsData);
        console.log(`Broadcasting results for game ${gameId}.`);

        // After a delay, send the next round's question
        setTimeout(() => {
            io.to(gameId).emit('game:new_round', nextRoundData);
            console.log(`Broadcasting next round for game ${gameId}.`);
        }, 15000); // 15 second delay to view results
    });

    socket.on('admin:end_game', ({ gameId }) => {
        io.to(gameId).emit('game:end');
        console.log(`Admin ended game ${gameId}. Broadcasting completion.`);
    });

    socket.on('admin:lobby_assigned', ({ gameId, profileId, lobbyId, lobbyName }) => {
        if (!gameId || !profileId) {
            console.warn('Received lobby assignment without gameId or profileId');
            return;
        }

        io.to(gameId).emit('lobby:assigned', {
            profileId,
            lobbyId,
            lobbyName,
        });

        console.log(`Broadcasted lobby assignment for profile ${profileId} in game ${gameId}.`);
    });

    // --- DISCONNECTION ---
    socket.on("disconnect", () => {
        console.log(`❌ User disconnected: ${socket.id}`);
    });
});