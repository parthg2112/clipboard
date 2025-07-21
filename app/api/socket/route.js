// app/api/socket/route.js
import { Server } from 'socket.io';
import clientPromise from '../../lib/mongodb';

const DB_NAME = process.env.CLIPBOARD_DB_NAME || 'live_clipboard';

// This is a custom response to work with how Next.js handles API routes.
// We need to end the response to signal the HTTP request is complete,
// while the WebSocket server continues to run in the background.
const CustomResponse = {
  socket: {
    server: {
      io: null,
    },
  },
  end() {
    // This function is intentionally left blank.
    // We don't want to close the connection in the traditional HTTP sense.
  },
};

const socketHandler = (req, res) => {
  // Check if the Socket.IO server has already been initialized.
  if (CustomResponse.socket.server.io) {
    console.log('Socket.IO server already running.');
    res.end();
    return;
  }

  console.log('Initializing new Socket.IO server...');
  // Create a new Socket.IO server and attach it to the response object.
  // This is a common pattern for integrating Socket.IO with Next.js.
  const io = new Server(res.socket.server, {
    path: '/api/socket',
    addTrailingSlash: false,
    cors: {
      origin: "*", // Be more specific in production for security
      methods: ['GET', 'POST'],
    },
  });

  // Save the server instance to our custom response object.
  CustomResponse.socket.server.io = io;
  global.io = io; // Also save to global for access in other API routes

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
        console.log(`Authenticating room: ${roomId}`);
        const client = await clientPromise;
        const db = client.db(DB_NAME);
        let room = await db.collection('clipboards').findOne({ _id: roomId });

        if (!room) {
          // If the room doesn't exist, create it.
          room = {
            _id: roomId,
            passwordHash,
            textNotes: [],
            files: [],
            createdAt: new Date(),
            lastUpdated: new Date(),
          };
          await db.collection('clipboards').insertOne(room);
          console.log(`Created new room: ${roomId}`);
        } else if (room.passwordHash && room.passwordHash !== passwordHash) {
          // If the room exists, validate the password hash.
          socket.emit('authentication-failed', { message: 'Invalid password.' });
          return;
        }

        socket.join(roomId);
        socket.roomId = roomId; // Associate the room ID with the socket session.

        socket.emit('authentication-success');
        socket.emit('room-data', {
          textNotes: room.textNotes || [],
          files: room.files || [],
        });
        console.log(`Client ${socket.id} joined room: ${roomId}`);
      } catch (error) {
        console.error('Room authentication error:', error);
        socket.emit('authentication-failed', { message: 'Server error during authentication.' });
      }
    });

    // --- CRUD Operations for Text Notes ---

    socket.on('add-note', async ({ roomId, note }) => {
        if (socket.roomId !== roomId) return socket.emit('error', { message: 'Not authenticated for this room' });
        const client = await clientPromise;
        const db = client.db(DB_NAME);
        const noteWithTimestamp = { ...note, createdAt: new Date(), updatedAt: new Date() };
        await db.collection('clipboards').updateOne({ _id: roomId }, { $push: { textNotes: noteWithTimestamp }, $set: { lastUpdated: new Date() } });
        io.to(roomId).emit('note-added', noteWithTimestamp);
    });

    socket.on('update-note', async ({ roomId, noteId, encryptedContent }) => {
        if (socket.roomId !== roomId) return socket.emit('error', { message: 'Not authenticated for this room' });
        const client = await clientPromise;
        const db = client.db(DB_NAME);
        await db.collection('clipboards').updateOne(
            { _id: roomId, 'textNotes.id': noteId },
            { $set: { 'textNotes.$.content': encryptedContent, 'textNotes.$.updatedAt': new Date(), lastUpdated: new Date() } }
        );
        socket.to(roomId).emit('note-updated', { noteId, encryptedContent });
    });

    socket.on('delete-note', async ({ roomId, noteId }) => {
        if (socket.roomId !== roomId) return socket.emit('error', { message: 'Not authenticated for this room' });
        const client = await clientPromise;
        const db = client.db(DB_NAME);
        await db.collection('clipboards').updateOne({ _id: roomId }, { $pull: { textNotes: { id: noteId } }, $set: { lastUpdated: new Date() } });
        io.to(roomId).emit('note-deleted', noteId);
    });


    // --- Disconnect Logic ---
    socket.on('disconnect', (reason) => {
      console.log(`Client ${socket.id} disconnected: ${reason}`);
    });
  });

  res.end();
};

// Next.js API route handler for both GET and POST to ensure the socket server starts.
export { socketHandler as GET, socketHandler as POST };
