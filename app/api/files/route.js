// app/api/files/route.js
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import clientPromise from '../../lib/mongodb';
import { v4 as uuidv4 } from 'uuid';

const DB_NAME = process.env.CLIPBOARD_DB_NAME || 'live_clipboard';

// --- In-memory Rate Limiter ---
// NOTE: For a multi-server setup, a dedicated service like Redis would be better.
const rateLimitStore = {};
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const RATE_LIMIT_MAX_UPLOADS = 20; // Max 20 uploads per room per 10 minutes

const checkRateLimit = (roomId) => {
  const now = Date.now();
  const roomData = rateLimitStore[roomId] || [];

  // Filter out old timestamps
  const recentUploads = roomData.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW_MS);

  if (recentUploads.length >= RATE_LIMIT_MAX_UPLOADS) {
    return false; // Limit exceeded
  }

  // Add current upload timestamp and update store
  recentUploads.push(now);
  rateLimitStore[roomId] = recentUploads;
  return true;
};


export async function POST(req) {
  try {
    const formData = await req.formData();
    
    const roomId = formData.get('roomId');
    const encryptedName = formData.get('encryptedName');
    const file = formData.get('file');
    const originalType = formData.get('originalType');

    if (!roomId || !encryptedName || !file) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check file size (100MB limit)
    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: `File size too large. Maximum allowed size is 100MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.` 
      }, { status: 413 }); // 413 Payload Too Large
    }

    // Enforce rate limiting
    if (!checkRateLimit(roomId)) {
      return NextResponse.json({ error: 'Too many uploads. Please try again later.' }, { status: 429 });
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await fs.mkdir(uploadDir, { recursive: true });

    const fileExtension = path.extname(file.name);
    const uniqueFilename = `${uuidv4()}${fileExtension}`;
    const filePath = path.join(uploadDir, uniqueFilename);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await fs.writeFile(filePath, buffer);

    const newFile = {
      id: uuidv4(),
      name: encryptedName,
      url: `/uploads/${uniqueFilename}`,
      type: originalType, // Use the original type here
      size: file.size, // This will be the size of the encrypted file
      createdAt: Date.now(),
    };

    const client = await clientPromise;
    const db = client.db(DB_NAME);

    await db.collection('clipboards').updateOne(
      { _id: roomId },
      {
        $push: { files: newFile },
        $set: { lastUpdated: new Date() }, // Crucially, update the timestamp
      },
      { upsert: true }
    );

    if (global.io) {
      global.io.to(roomId).emit('file-added', newFile);
    }

    return NextResponse.json({ success: true, file: newFile });

  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json({ error: 'Error processing file upload' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get('roomId');
    const fileId = searchParams.get('fileId');

    if (!roomId || !fileId) {
      return NextResponse.json({ error: 'Missing roomId or fileId' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(DB_NAME);

    const clipboard = await db.collection('clipboards').findOne(
      { _id: roomId },
      { projection: { files: { $elemMatch: { id: fileId } } } }
    );

    if (clipboard?.files?.length > 0) {
      const fileToDelete = clipboard.files[0];
      try {
        const filePath = path.join(process.cwd(), 'public', fileToDelete.url);
        await fs.unlink(filePath);
      } catch (fsError) {
        console.error('Could not delete file from filesystem (it may already be gone):', fsError.message);
      }
    }

    await db.collection('clipboards').updateOne(
      { _id: roomId },
      {
        $pull: { files: { id: fileId } },
        $set: { lastUpdated: new Date() } // Also update timestamp on delete
      }
    );

    if (global.io) {
      global.io.to(roomId).emit('file-deleted', fileId);
    }

    return NextResponse.json({ success: true, message: 'File deleted successfully' });
  } catch (error) {
    console.error('File deletion error:', error);
    return NextResponse.json({ error: 'Error deleting file' }, { status: 500 });
  }
}
