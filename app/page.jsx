"use client";

import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { Toaster, toast } from 'react-hot-toast';
import { deriveKey, getRoomId, hashPassword } from './lib/crypto';
import PasswordScreen from './components/PasswordScreen';
import ClipboardUI from './components/ClipboardUI';

export default function HomePage() {
  const [socket, setSocket] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const [encryptionKey, setEncryptionKey] = useState(null);
  const [clipboard, setClipboard] = useState({ textNotes: [], files: [] });
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState({
    socket: 'disconnected',
    mongodb: 'unknown'
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // ... (socket connection logic remains the same)
    const socketConnection = io({ transports: ['websocket'] });
    // ... (all socket listeners remain the same)

    // --- PASTE YOUR EXISTING useEffect LISTENERS HERE ---
    socketConnection.on('connect', () => {
      setSocket(socketConnection);
      toast.success('Connected!');
      setConnectionStatus(prev => ({ ...prev, socket: 'connected' }));
      socketConnection.emit('test-connection');
    });

    socketConnection.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      toast.error('Connection lost. Reconnecting...');
      setSocket(null);
      setIsAuthenticated(false);
      setConnectionStatus({ socket: 'disconnected', mongodb: 'unknown' });
    });

    socketConnection.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    socketConnection.on('connection-status', (status) => {
      setConnectionStatus(status);
      if (status.mongodb === 'failed') {
        toast.error('Database connection failed.');
      }
    });

    socketConnection.on('authentication-success', () => {
      toast.success('Room unlocked!');
      setIsAuthenticated(true);
      setIsDataLoading(false);
    });
    
    socketConnection.on('room-deleted', () => {
      toast.error('This room has been permanently deleted.', {
        duration: 5000,
      });
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    });

    socketConnection.on('authentication-failed', (error) => {
      toast.error(`Authentication failed: ${error.message}`);
      setIsDataLoading(false);
      setRoomId(null);
      setEncryptionKey(null);
      setIsAuthenticated(false);
    });

    socketConnection.on('room-data', (data) => {
      setClipboard({
        textNotes: data.textNotes || [],
        files: data.files || []
      });
    });

    socketConnection.on('note-added', (newNote) => {
      setClipboard(prev => ({ ...prev, textNotes: [...prev.textNotes, newNote] }));
    });
    socketConnection.on('note-updated', ({ noteId, encryptedContent }) => {
      setClipboard(prev => ({
        ...prev,
        textNotes: prev.textNotes.map(n => n.id === noteId ? { ...n, content: encryptedContent, updatedAt: new Date() } : n)
      }));
    });
    socketConnection.on('note-deleted', (noteId) => {
      setClipboard(prev => ({ ...prev, textNotes: prev.textNotes.filter(n => n.id !== noteId) }));
    });
    socketConnection.on('file-added', (newFile) => {
      setClipboard(prev => ({ ...prev, files: [...prev.files, newFile] }));
    });
    socketConnection.on('file-deleted', (fileId) => {
      setClipboard(prev => ({ ...prev, files: prev.files.filter(f => f.id !== fileId) }));
    });


    return () => {
      socketConnection.disconnect();
    };
  }, []);

  // Updated to accept 'expiration'
  const handlePasswordSubmit = async (password, expiration) => {
    // Password length check is now handled in PasswordScreen, but we can keep a fallback.
    if (!password || password.length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }
    setIsDataLoading(true);
    const loadingToast = toast.loading('Encrypting and joining room...');

    try {
      const derivedRoomId = await getRoomId(password);
      const key = await deriveKey(password, derivedRoomId);
      const passwordHash = await hashPassword(password);

      setRoomId(derivedRoomId);
      setEncryptionKey(key);

      if (socket && socket.connected) {
        // Send the expiration value to the server
        socket.emit('authenticate-room', { 
          roomId: derivedRoomId, 
          passwordHash,
          expiration // Pass the expiration in milliseconds
        });
      } else {
        toast.error('Connection not ready. Please wait.', { id: loadingToast });
        setIsDataLoading(false);
        return;
      }
      toast.dismiss(loadingToast);
    } catch (error) {
      toast.error("Could not process password.", { id: loadingToast });
      setIsDataLoading(false);
    }
  };

  const handleLogout = () => {
    window.location.reload();
  };

  return (
    <>
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: '#333',
            color: '#fff',
          },
        }}
      />
      {!isAuthenticated ? (
        <PasswordScreen onSubmit={handlePasswordSubmit} isLoading={isDataLoading} />
      ) : (
        <ClipboardUI
          roomId={roomId}
          encryptionKey={encryptionKey}
          clipboard={clipboard}
          socket={socket}
          connectionStatus={connectionStatus}
          onLogout={handleLogout}
        />
      )}
    </>
  );
}
