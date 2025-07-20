import { formidable } from 'formidable';
import path from 'path';
import fs from 'fs/promises';
import clientPromise from './lib/mongodb';
import { v4 as uuidv4 } from 'uuid';

export const config = {
  api: {
    bodyParser: false,
  },
};

const DB_NAME = process.env.CLIPBOARD_DB_NAME || 'live_clipboard';

const uploadHandler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Ensure the upload directory exists
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  await fs.mkdir(uploadDir, { recursive: true });

  const form = formidable({
    uploadDir,
    keepExtensions: true,
    filename: (name, ext) => {
      return `${uuidv4()}${ext}`;
    },
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ error: 'Error parsing form data' });
    }

    const { roomId, encryptedName } = fields;
    const file = files.file;

    if (!roomId || !encryptedName || !file) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const newFile = {
      id: uuidv4(),
      name: encryptedName[0],
      url: `/uploads/${file[0].newFilename}`,
      type: file[0].mimetype,
      size: file[0].size,
      createdAt: Date.now(),
    };

    try {
      const client = await clientPromise;
      const db = client.db(DB_NAME);
      await db.collection('clipboards').updateOne(
        { _id: roomId[0] },
        { $push: { files: newFile }, $setOnInsert: { text: '' } },
        { upsert: true }
      );

      // Notify clients via Socket.IO
      const io = res.socket.server.io;
      if (io) {
        io.to(roomId[0]).emit('receive-file-update', newFile);
      }

      res.status(200).json({ success: true, file: newFile });
    } catch (error) {
      console.error('Error updating database with file:', error);
      res.status(500).json({ error: 'Error saving file data' });
    }
  });
};

export default uploadHandler;