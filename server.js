// server.js

// Load environment variables from .env.local
require('dotenv').config({ path: './.env.local' });

const { createServer } = require('http');
const next = require('next');
const { Server } = require('socket.io');
const { MongoClient } = require('mongodb');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;

// Create the Next.js app instance
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

// --- MongoDB Setup ---
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.CLIPBOARD_DB_NAME || 'live_clipboard';
if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable in .env.local');
}
const clientPromise = new MongoClient(MONGODB_URI).connect();
console.log('MongoDB client configured.');


app.prepare().then(() => {
    // Create the main HTTP server for Next.js
    const httpServer = createServer(handler);

    // Attach the Socket.IO server to the same HTTP server
    const io = new Server(httpServer, {
        cors: {
            origin: `http://localhost:${port}`, // Allow connections from the Next.js app
            methods: ['GET', 'POST'],
        },
    });

    // Make the io instance globally available for other parts of the app if needed
    global.io = io;

    // --- Main Socket.IO Connection Logic ---
    io.on('connection', (socket) => {
        console.log(`Client connected: ${socket.id}`);

        // Event to test the MongoDB connection status from the client.
        socket.on('test-connection', async () => {
            try {
                const client = await clientPromise;
                await client.db(DB_NAME).command({ ping: 1 });
                console.log('MongoDB connection successful.');
                socket.emit('connection-status', {
                    socket: 'connected',
                    mongodb: 'connected',
                });
            } catch (error) {
                console.error('MongoDB connection failed:', error.message);
                socket.emit('connection-status', {
                    socket: 'connected',
                    mongodb: 'failed',
                    error: error.message,
                });
            }
        });

        // Event for a client to authenticate and join a specific room.
        socket.on('authenticate-room', async ({ roomId, passwordHash }) => {
            try {
                const client = await clientPromise;
                const db = client.db(DB_NAME);
                let room = await db.collection('clipboards').findOne({ _id: roomId });

                if (!room) {
                    room = { _id: roomId, passwordHash, textNotes: [], files: [], createdAt: new Date(), lastUpdated: new Date() };
                    await db.collection('clipboards').insertOne(room);
                    console.log(`Created new room: ${roomId}`);
                } else if (room.passwordHash && room.passwordHash !== passwordHash) {
                    socket.emit('authentication-failed', { message: 'Invalid password.' });
                    return;
                }

                socket.join(roomId);
                socket.roomId = roomId;

                socket.emit('authentication-success');
                socket.emit('room-data', { textNotes: room.textNotes || [], files: room.files || [] });
                console.log(`Client ${socket.id} joined room: ${roomId}`);
            } catch (error) {
                console.error('Room authentication error:', error);
                socket.emit('authentication-failed', { message: 'Server error during authentication.' });
            }
        });

        // --- CRUD Operations for Text Notes ---
        socket.on('add-note', async ({ roomId, note }) => {
            if (socket.roomId !== roomId) return;
            const client = await clientPromise;
            const db = client.db(DB_NAME);
            const noteWithTimestamp = { ...note, createdAt: new Date(), updatedAt: new Date() };
            await db.collection('clipboards').updateOne({ _id: roomId }, { $push: { textNotes: noteWithTimestamp }, $set: { lastUpdated: new Date() } });
            io.to(roomId).emit('note-added', noteWithTimestamp);
        });

        socket.on('update-note', async ({ roomId, noteId, encryptedContent }) => {
            if (socket.roomId !== roomId) return;
            const client = await clientPromise;
            const db = client.db(DB_NAME);
            await db.collection('clipboards').updateOne({ _id: roomId, 'textNotes.id': noteId }, { $set: { 'textNotes.$.content': encryptedContent, 'textNotes.$.updatedAt': new Date(), lastUpdated: new Date() } });
            socket.to(roomId).emit('note-updated', { noteId, encryptedContent });
        });

        socket.on('delete-note', async ({ roomId, noteId }) => {
            if (socket.roomId !== roomId) return;
            const client = await clientPromise;
            const db = client.db(DB_NAME);
            await db.collection('clipboards').updateOne({ _id: roomId }, { $pull: { textNotes: { id: noteId } }, $set: { lastUpdated: new Date() } });
            io.to(roomId).emit('note-deleted', noteId);
        });

        socket.on('disconnect', (reason) => {
            console.log(`Client ${socket.id} disconnected: ${reason}`);
        });
    });

    // Start listening
    httpServer
        .listen(port, () => {
            console.log(`> Ready on http://${hostname}:${port}`);
        })
        .on('error', (err) => {
            console.error(err);
        });
});
