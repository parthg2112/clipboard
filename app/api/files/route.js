import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import clientPromise from '../../lib/mongodb';
import { v4 as uuidv4 } from 'uuid';

const DB_NAME = process.env.CLIPBOARD_DB_NAME || 'live_clipboard';

export async function POST(req) {
  try {
    const formData = await req.formData();
    
    const roomId = formData.get('roomId');
    const encryptedName = formData.get('encryptedName');
    const file = formData.get('file');

    if (!roomId || !encryptedName || !file) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log(`Processing file upload for room: ${roomId}`);

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

    console.log(`File saved to: ${filePath}`);

    // Define the newFile object
    const newFile = {
      id: uuidv4(),
      name: encryptedName,
      url: `/uploads/${uniqueFilename}`,
      type: file.type,
      size: file.size,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Save to MongoDB
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    
    const result = await db.collection('clipboards').updateOne(
      { _id: roomId },
      { 
        $push: { files: newFile },
        $set: { lastUpdated: new Date() },
        $setOnInsert: { 
          textNotes: [],
          createdAt: new Date()
        }
      },
      { upsert: true }
    );

    console.log('File saved to MongoDB:', result.modifiedCount > 0 || result.upsertedCount > 0);

    // Broadcast via Socket.IO
    if (global.io) {
      global.io.to(roomId).emit('file-added', newFile);
      console.log(`File broadcasted to room: ${roomId}`);
    } else {
      console.warn('Socket.IO not available for broadcasting file-added event');
    }

    return NextResponse.json({ 
      success: true, 
      file: newFile,
      message: 'File uploaded successfully'
    });
  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json({ 
      error: 'Error processing file upload',
      details: error.message 
    }, { status: 500 });
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

    console.log(`Deleting file ${fileId} from room: ${roomId}`);

    const client = await clientPromise;
    const db = client.db(DB_NAME);

    // Get file info before deletion for cleanup
    const clipboard = await db.collection('clipboards').findOne(
      { _id: roomId },
      { projection: { files: { $elemMatch: { id: fileId } } } }
    );

    if (clipboard?.files?.length > 0) {
      const fileToDelete = clipboard.files[0];
      
      // Delete file from filesystem
      try {
        const filePath = path.join(process.cwd(), 'public', fileToDelete.url);
        await fs.unlink(filePath);
        console.log(`File deleted from filesystem: ${filePath}`);
      } catch (fsError) {
        console.error('Error deleting file from filesystem:', fsError);
        // Continue with database deletion even if file cleanup fails
      }
    }

    // Remove from MongoDB
    const result = await db.collection('clipboards').updateOne(
      { _id: roomId },
      { 
        $pull: { files: { id: fileId } },
        $set: { lastUpdated: new Date() }
      }
    );

    console.log('File removed from MongoDB:', result.modifiedCount > 0);

    // Broadcast via Socket.IO
    if (global.io) {
      global.io.to(roomId).emit('file-deleted', fileId);
      console.log(`File deletion broadcasted to room: ${roomId}`);
    } else {
      console.warn('Socket.IO not available for broadcasting file-deleted event');
    }

    return NextResponse.json({ 
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('File deletion error:', error);
    return NextResponse.json({ 
      error: 'Error deleting file',
      details: error.message 
    }, { status: 500 });
  }
}