import { Server } from 'socket.io';
import clientPromise from '@/lib/mongodb';

const DB_NAME = process.env.CLIPBOARD_DB_NAME || 'live_clipboard';

const SocketHandler = (req, res) => {
  if (res.socket.server.io) {
    console.log('Socket is already running');
  } else {
    console.log('Socket is initializing');
    const io = new Server(res.socket.server, { path: '/api/socket' });
    res.socket.server.io = io;

    io.on('connection', socket => {
      socket.on('join-room', async (roomId) => {
        socket.join(roomId);
        try {
          const client = await clientPromise;
          const db = client.db(DB_NAME);
          const clipboard = await db.collection('clipboards').findOne({ _id: roomId });
          if (clipboard) {
            socket.emit('load-data', clipboard);
          } else {
            // If no clipboard exists, send empty data
            socket.emit('load-data', { text: '', files: [] });
          }
        } catch (error) {
          console.error('Error fetching clipboard data:', error);
        }
      });

      socket.on('text-update', async ({ roomId, encryptedText }) => {
        try {
          const client = await clientPromise;
          const db = client.db(DB_NAME);
          await db.collection('clipboards').updateOne(
            { _id: roomId },
            { $set: { text: encryptedText } },
            { upsert: true }
          );
          // Broadcast to all other clients in the room
          socket.to(roomId).emit('receive-text-update', encryptedText);
        } catch (error) {
          console.error('Error updating text:', error);
        }
      });

      // File updates are handled via the upload API, which then emits an event
    });
  }
  res.end();
};

export default SocketHandler;