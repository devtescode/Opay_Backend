const socketIo = require('socket.io');
let io; // To hold the socket.io instance

// Initialize socket.io with the server
const initializeSocket = (server) => {
    io = socketIo(server, {
        cors: {
            origin: '*', // You can limit this to specific origins
        },
    });

    io.on('connection', (socket) => {
        console.log('New client connected');

        socket.on('disconnect', () => {
            console.log('Client disconnected');
        });
    });
};

// Function to retrieve the io instance (returns an error if io is not initialized)
const getSocket = () => {
    if (!io) {
        throw new Error('Socket.io is not initialized yet');
    }
    return io;
};

module.exports = { initializeSocket, getSocket }; // Export both functions
