"use client";

import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { deriveKey, getRoomId } from './lib/crypto';
import PasswordScreen from './components/PasswordScreen';
import ClipboardUI from './components/ClipboardUI';

// No "let socket;" here anymore

export default function HomePage() {
  // 1. Manage the socket instance in React state
  const [socket, setSocket] = useState(null); 
  const [roomId, setRoomId] = useState(null);
  const [encryptionKey, setEncryptionKey] = useState(null);
  const [clipboard, setClipboard] = useState({ textNotes: [], files: [] });
  const [isDataLoading, setIsDataLoading] = useState(true);

  // 2. This is now the SINGLE, UNIFIED useEffect for all socket logic.
  useEffect(() => {
    // This fetch "wakes up" the serverless function that runs the socket server.
    fetch('/api/socket'); 

    // Initialize the client-side socket connection.
    const socketIo = io({ path: '/api/socket' });

    socketIo.on('connect', () => {
      console.log('Connected to socket server:', socketIo.id);
      // Once connected, we store the socket instance in our state.
      setSocket(socketIo);
    });

    socketIo.on('disconnect', () => {
      console.log('Disconnected from socket server');
      setSocket(null); // Clear the socket from state on disconnect.
    });

    // --- All event listeners are set up here, just once ---

    socketIo.on('load-data', (data) => {
      setClipboard({
        textNotes: data.textNotes || [],
        files: data.files || []
      });
      setIsDataLoading(false);
    });

    socketIo.on('note-added', (newNote) => {
      setClipboard(prev => ({ ...prev, textNotes: [...prev.textNotes, newNote] }));
    });

    socketIo.on('note-updated', ({ noteId, encryptedContent }) => {
      setClipboard(prev => ({
        ...prev,
        textNotes: prev.textNotes.map(n =>
          n.id === noteId ? { ...n, content: encryptedContent } : n
        )
      }));
    });

    socketIo.on('note-deleted', (noteId) => {
      setClipboard(prev => ({
        ...prev,
        textNotes: prev.textNotes.filter(n => n.id !== noteId)
      }));
    });

    socketIo.on('file-added', (newFile) => {
      setClipboard(prev => ({ ...prev, files: [...prev.files, newFile] }));
    });

    socketIo.on('file-deleted', (fileId) => {
      setClipboard(prev => ({ ...prev, files: prev.files.filter(f => f.id !== fileId) }));
    });

    socketIo.on('error', (error) => {
      console.error('Socket error:', error);
    });

    // This cleanup function runs when the component is unmounted.
    return () => {
      socketIo.disconnect();
    };
  }, []); // The empty dependency array [] means this runs only once.

  // 3. This useEffect now correctly depends on `socket` from state.
  useEffect(() => {
    if (socket && roomId) {
      socket.emit('join-room', roomId);
    }
  }, [socket, roomId]); // Runs when socket connects OR roomId is set.

  const handlePasswordSubmit = async (password) => {
    if (!password) return;
    try {
      const derivedRoomId = await getRoomId(password);
      const key = await deriveKey(password, derivedRoomId);
      setEncryptionKey(key);
      setRoomId(derivedRoomId);
    } catch (error) {
      console.error("Key derivation failed:", error);
      alert("Could not process password.");
    }
  };
  
  const handleLogout = () => {
    // Simply reset state. The main useEffect's cleanup will handle disconnection.
    window.location.reload(); // The simplest way to fully reset the connection and state.
  };

  if (!encryptionKey || !roomId) {
    return <PasswordScreen onSubmit={handlePasswordSubmit} />;
  }

  // We now pass the `socket` from our state down to the UI
  return (
    <ClipboardUI
      roomId={roomId}
      encryptionKey={encryptionKey}
      clipboard={clipboard}
      socket={socket}
      onLogout={handleLogout}
    />
  );
}