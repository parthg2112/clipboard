// server.js
require('dotenv').config({ path: './.env.local' });

const { createServer } = require('http');
const next = require('next');
const { Server } = require('socket.io');
const { MongoClient } = require('mongodb');
const cron = require('node-cron');
const fs = require('fs/promises');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;

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

// --- Automatic Cleanup Logic ---
const cleanupInactiveClipboards = async () => {
    console.log('Running cleanup job for inactive clipboards...');
    try {
        const client = await clientPromise;
        const db = client.db(DB_NAME);
        const collection = db.collection('clipboards');
        const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

        const inactiveClipboards = await collection.find({
            lastUpdated: { $lt: sixHoursAgo }
        }).toArray();

        if (inactiveClipboards.length === 0) {
            console.log('Cleanup: No inactive clipboards found.');
            return;
        }

        console.log(`Cleanup: Found ${inactiveClipboards.length} inactive clipboard(s) to delete.`);
        for (const clipboard of inactiveClipboards) {
            if (clipboard.files && clipboard.files.length > 0) {
                for (const file of clipboard.files) {
                    try {
                        const filePath = path.join(process.cwd(), 'public', file.url);
                        await fs.unlink(filePath);
                    } catch (err) {
                        if (err.code !== 'ENOENT') {
                            console.error(`Cleanup: Error deleting file ${file.url}:`, err);
                        }
                    }
                }
            }
            await collection.deleteOne({ _id: clipboard._id });
            console.log(`Cleanup: Deleted clipboard for room ${clipboard._id}`);
        }
    } catch (error) {
        console.error('Error during clipboard cleanup job:', error);
    }
};

cron.schedule('0 * * * *', cleanupInactiveClipboards);

app.prepare().then(() => {
    const httpServer = createServer(handler);
    const io = new Server(httpServer, {
        cors: {
            origin: `http://localhost:${port}`,
            methods: ['GET', 'POST'],
        },
    });
    global.io = io;

    io.on('connection', (socket) => {
        console.log(`Client connected: ${socket.id}`);

        // --- FIXED: Re-added the missing test-connection handler ---
        socket.on('test-connection', async () => {
            try {
                const client = await clientPromise;
                await client.db(DB_NAME).command({ ping: 1 });
                socket.emit('connection-status', {
                    socket: 'connected',
                    mongodb: 'connected',
                });
            } catch (error) {
                console.error('MongoDB connection failed on test:', error.message);
                socket.emit('connection-status', {
                    socket: 'connected',
                    mongodb: 'failed',
                    error: error.message,
                });
            }
        });

        const updateRoomTimestamp = async (roomId) => {
            try {
                const client = await clientPromise;
                await client.db(DB_NAME).collection('clipboards').updateOne(
                    { _id: roomId },
                    { $set: { lastUpdated: new Date() } }
                );
            } catch (error) {
                console.error(`Failed to update timestamp for room ${roomId}:`, error);
            }
        };

        socket.on('authenticate-room', async ({ roomId, passwordHash }) => {
            try {
                const client = await clientPromise;
                const db = client.db(DB_NAME);
                let room = await db.collection('clipboards').findOne({ _id: roomId });

                if (!room) {
                    room = { _id: roomId, passwordHash, textNotes: [], files: [], createdAt: new Date(), lastUpdated: new Date() };
                    await db.collection('clipboards').insertOne(room);
                } else {
                    if (room.passwordHash && room.passwordHash !== passwordHash) {
                        socket.emit('authentication-failed', { message: 'Invalid password.' });
                        return;
                    }
                    await updateRoomTimestamp(roomId);
                }

                socket.join(roomId);
                socket.roomId = roomId;
                socket.emit('authentication-success');
                socket.emit('room-data', { textNotes: room.textNotes || [], files: room.files || [] });
            } catch (error) {
                socket.emit('authentication-failed', { message: 'Server error during authentication.' });
            }
        });
        
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
            await db.collection('clipboards').updateOne(
                { _id: roomId, 'textNotes.id': noteId },
                { $set: { 'textNotes.$.content': encryptedContent, 'textNotes.$.updatedAt': new Date(), lastUpdated: new Date() } }
            );
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

    httpServer.listen(port, () => {
        console.log(`> Ready on http://${hostname}:${port}`);
        cleanupInactiveClipboards();
    }).on('error', (err) => {
        console.error(err);
    });
});
