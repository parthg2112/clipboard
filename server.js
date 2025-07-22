// server.js
require('dotenv').config({ path: './.env.local' });

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const { MongoClient } = require('mongodb');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3020;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.CLIPBOARD_DB_NAME || 'live_clipboard';
if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable in .env.local');
}
const clientPromise = new MongoClient(MONGODB_URI).connect();
console.log('MongoDB client configured.');

const deleteClipboardData = async (clipboard) => {
    if (!clipboard) return;
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    if (clipboard.files && clipboard.files.length > 0) {
        for (const file of clipboard.files) {
            try {
                const filePath = path.join(process.cwd(), 'public', file.url);
                await fs.promises.unlink(filePath);
            } catch (err) {
                if (err.code !== 'ENOENT') {
                    console.error(`Error deleting file ${file.url}:`, err);
                }
            }
        }
    }
    await db.collection('clipboards').deleteOne({ _id: clipboard._id });
    console.log(`Deleted clipboard for room ${clipboard._id}`);
};

const cleanupInactiveClipboards = async () => {
    console.log('Running cleanup job for inactive clipboards...');
    try {
        const client = await clientPromise;
        const db = client.db(DB_NAME);
        const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);

        const inactiveClipboards = await db.collection('clipboards').find({
            lastUpdated: { $lt: oneHourAgo }
        }).toArray();

        if (inactiveClipboards.length > 0) {
            for (const clipboard of inactiveClipboards) {
                await deleteClipboardData(clipboard);
            }
        }
    } catch (error) {
        console.error('Error during clipboard cleanup job:', error);
    }
};

cron.schedule('0 * * * *', cleanupInactiveClipboards);

app.prepare().then(() => {
    const httpServer = createServer(async (req, res) => {
        try {
            const parsedUrl = parse(req.url, true);
            const { pathname } = parsedUrl;

            if (pathname.startsWith('/uploads/')) {
                const filePath = path.join(process.cwd(), 'public', pathname);
                fs.stat(filePath, (err, stats) => {
                    if (err || !stats.isFile()) {
                        res.statusCode = 404;
                        res.end('Not Found');
                        return;
                    }
                    res.setHeader('Content-Length', stats.size);
                    const readStream = fs.createReadStream(filePath);
                    readStream.pipe(res);
                });
            } else {
                await handle(req, res, parsedUrl);
            }
        } catch (err) {
            console.error('Error handling request', err);
            res.statusCode = 500;
            res.end('Internal Server Error');
        }
    });

    const io = new Server(httpServer, {
        cors: { origin: `http://localhost:${port}`, methods: ['GET', 'POST'] },
    });
    global.io = io;

    io.on('connection', (socket) => {
        socket.on('test-connection', async () => {
            try {
                const client = await clientPromise;
                await client.db(DB_NAME).command({ ping: 1 });
                socket.emit('connection-status', {
                    socket: 'connected',
                    mongodb: 'connected',
                });
            } catch (error) {
                socket.emit('connection-status', {
                    socket: 'connected',
                    mongodb: 'failed',
                    error: error.message,
                });
            }
        });

        socket.on('delete-room', async ({ roomId }) => {
            if (socket.roomId !== roomId) return;
            try {
                const client = await clientPromise;
                const db = client.db(DB_NAME);
                const clipboard = await db.collection('clipboards').findOne({ _id: roomId });
                
                if (clipboard) {
                    await deleteClipboardData(clipboard);
                    io.to(roomId).emit('room-deleted');
                }
            } catch (error) {
                socket.emit('error', { message: 'Failed to delete room.' });
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

            // UPDATED: Server-side check for new 4-note limit
            const room = await db.collection('clipboards').findOne({ _id: roomId }, { projection: { textNotes: 1 } });
            if (room && room.textNotes && room.textNotes.length >= 4) {
                socket.emit('error', { message: 'Maximum 4 text notes allowed.' });
                return;
            }

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
    });

    httpServer.listen(port, () => {
        console.log(`> Ready on http://${hostname}:${port}`);
        cleanupInactiveClipboards();
    });
});
