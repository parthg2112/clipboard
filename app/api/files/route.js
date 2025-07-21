import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import clientPromise from '../../lib/mongodb';
import { v4 as uuidv4 } from 'uuid';

const DB_NAME = process.env.CLIPBOARD_DB_NAME || 'live_clipboard';

// In app/api/files/route.js

export async function POST(req) {
  try {
    const formData = await req.formData();
    
    const roomId = formData.get('roomId');
    const encryptedName = formData.get('encryptedName');
    const file = formData.get('file');

    if (!roomId || !encryptedName || !file) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // ✅ START: ADD THIS MISSING LOGIC BACK
    // Create uploads directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await fs.mkdir(uploadDir, { recursive: true });

    // Generate unique filename
    const fileExtension = path.extname(file.name);
    const uniqueFilename = `${uuidv4()}${fileExtension}`;
    const filePath = path.join(uploadDir, uniqueFilename);

    // Save file to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await fs.writeFile(filePath, buffer);

    // Define the newFile object before using it
    const newFile = {
      id: uuidv4(),
      name: encryptedName,
      url: `/uploads/${uniqueFilename}`,
      type: file.type,
      size: file.size,
      createdAt: Date.now(),
    };
    // ✅ END: ADD THIS MISSING LOGIC BACK

    // Save to MongoDB
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    await db.collection('clipboards').updateOne(
      { _id: roomId },
      { 
        $push: { files: newFile }, // This will now work
        $setOnInsert: { textNotes: [] } 
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
    // [Code for getting params and deleting from filesystem remains the same]

    // Remove from MongoDB
    await db.collection('clipboards').updateOne(
      { _id: roomId },
      { $pull: { files: { id: fileId } } }
    );

    // ✅ **FIX:** Notify clients via Socket.IO only if it's available
    if (global.io) {
      global.io.to(roomId).emit('file-deleted', fileId);
    } else {
      console.warn('Socket.IO server not initialized. Skipping broadcast.');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('File deletion error:', error);
    return NextResponse.json({ error: 'Error deleting file' }, { status: 500 });
  }
}