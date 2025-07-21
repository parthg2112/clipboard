import { Server } from 'socket.io';
import clientPromise from '../../lib/mongodb';

const DB_NAME = process.env.CLIPBOARD_DB_NAME || 'live_clipboard';

let io;

export async function GET(req) {
  if (!global.io) {
    console.log("Initializing new Socket.IO server...");
    
    // Create the Socket.IO server
    io = new Server({
      path: '/api/socket',
      addTrailingSlash: false,
      cors: { 
        origin: "*", 
        methods: ["GET", "POST"],
        credentials: false
      },
      transports: ['websocket', 'polling']
    });
    
    global.io = io;

    io.on('connection', (socket) => {
      console.log('Socket connected:', socket.id);
      
      socket.on('join-room', async (roomId) => {
        console.log(`Socket ${socket.id} joining room: ${roomId}`);
        socket.join(roomId);
        
        try {
          const client = await clientPromise;
          const db = client.db(DB_NAME);
          const clipboard = await db.collection('clipboards').findOne({ _id: roomId });
          
          if (clipboard) {
            socket.emit('load-data', {
              textNotes: clipboard.textNotes || [],
              files: clipboard.files || []
            });
          } else {
            socket.emit('load-data', { textNotes: [], files: [] });
          }
        } catch (error) {
          console.error('Error fetching clipboard data:', error);
          socket.emit('error', { message: 'Failed to load data' });
        }
      });

      socket.on('add-note', async ({ roomId, note }) => {
        try {
          const client = await clientPromise;
          const db = client.db(DB_NAME);
          await db.collection('clipboards').updateOne(
            { _id: roomId },
            { 
              $push: { textNotes: note },
              $setOnInsert: { files: [] }
            },
            { upsert: true }
          );
          
          // Broadcast to all clients in the room
          io.to(roomId).emit('note-added', note);
        } catch (error) {
          console.error('Error adding note:', error);
          socket.emit('error', { message: 'Failed to add note' });
        }
      });

      socket.on('update-note', async ({ roomId, noteId, encryptedContent }) => {
        try {
          const client = await clientPromise;
          const db = client.db(DB_NAME);
          await db.collection('clipboards').updateOne(
            { _id: roomId, 'textNotes.id': noteId },
            { $set: { 'textNotes.$.content': encryptedContent } }
          );
          
          // Broadcast to other clients (not the sender)
          socket.to(roomId).emit('note-updated', { noteId, encryptedContent });
        } catch (error) {
          console.error('Error updating note:', error);
          socket.emit('error', { message: 'Failed to update note' });
        }
      });

      socket.on('delete-note', async ({ roomId, noteId }) => {
        try {
          const client = await clientPromise;
          const db = client.db(DB_NAME);
          await db.collection('clipboards').updateOne(
            { _id: roomId },
            { $pull: { textNotes: { id: noteId } } }
          );
          
          // Broadcast to all clients in the room
          io.to(roomId).emit('note-deleted', noteId);
        } catch (error) {
          console.error('Error deleting note:', error);
          socket.emit('error', { message: 'Failed to delete note' });
        }
      });

      socket.on('delete-file', async ({ roomId, fileId }) => {
        try {
          const client = await clientPromise;
          const db = client.db(DB_NAME);
          await db.collection('clipboards').updateOne(
            { _id: roomId },
            { $pull: { files: { id: fileId } } }
          );
          
          // Broadcast to all clients in the room
          io.to(roomId).emit('file-deleted', fileId);
        } catch (error) {
          console.error('Error deleting file:', error);
          socket.emit('error', { message: 'Failed to delete file' });
        }
      });

      socket.on('disconnect', () => {
        console.log('Socket disconnected:', socket.id);
      });

      socket.on('error', (error) => {
        console.error('Socket error:', error);
      });
    });
  } else {
    console.log("Socket.IO server already running.");
  }
  
  return new Response(JSON.stringify({ success: true, message: 'Socket.IO server initialized' }), { 
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}