import clientPromise from '@/lib/mongodb';
import path from 'path';
import fs from 'fs/promises';

const DB_NAME = process.env.CLIPBOARD_DB_NAME || 'live_clipboard';

const deleteHandler = async (req, res) => {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { roomId, fileId, fileUrl } = req.body;

  if (!roomId || !fileId || !fileUrl) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // 1. Delete from MongoDB
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    await db.collection('clipboards').updateOne(
      { _id: roomId },
      { $pull: { files: { id: fileId } } }
    );

    // 2. Delete from filesystem
    const filePath = path.join(process.cwd(), 'public', fileUrl);
    await fs.unlink(filePath);

    // 3. Notify clients via Socket.IO
    const io = res.socket.server.io;
    if (io) {
      io.to(roomId).emit('receive-file-delete', fileId);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error deleting file:', error);
    if (error.code === 'ENOENT') { // File not found, likely already deleted
        res.status(200).json({ success: true, message: "File already deleted from storage." });
    } else {
        res.status(500).json({ error: 'Error processing delete request' });
    }
  }
};

export default deleteHandler;