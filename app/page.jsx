"use client";

import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
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
    // Connect directly to the server. The `io()` function will automatically
    // use the current page's host and port (e.g., http://localhost:3000).
    // It's crucial that there is NO 'path' property here.
    const socketConnection = io({
        transports: ['websocket'], // Prioritize WebSocket for a direct TCP connection
    });

    // --- Socket Event Listeners ---
    socketConnection.on('connect', () => {
        console.log('Socket connected successfully:', socketConnection.id);
        setSocket(socketConnection);
        setConnectionStatus(prev => ({ ...prev, socket: 'connected' }));
        socketConnection.emit('test-connection');
    });

    socketConnection.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        setSocket(null);
        setIsAuthenticated(false);
        setConnectionStatus({ socket: 'disconnected', mongodb: 'unknown' });
    });

    socketConnection.on('connect_error', (error) => {
        // This is the event that was firing in your screenshot.
        console.error('Socket connection error:', error);
        setConnectionStatus(prev => ({ ...prev, socket: 'error' }));
    });
    
    socketConnection.on('connection-status', (status) => {
        console.log('Connection status from server:', status);
        setConnectionStatus(status);
    });

    // --- Authentication and Data Events ---
    socketConnection.on('authentication-success', () => {
        console.log('Room authentication successful.');
        setIsAuthenticated(true);
        setIsDataLoading(false);
    });

    socketConnection.on('authentication-failed', (error) => {
        console.error('Authentication failed:', error.message);
        alert(`Authentication failed: ${error.message}`);
        setIsDataLoading(false);
        setRoomId(null);
        setEncryptionKey(null);
        setIsAuthenticated(false);
    });

    socketConnection.on('room-data', (data) => {
        console.log('Received initial room data.');
        setClipboard({
            textNotes: data.textNotes || [],
            files: data.files || []
        });
    });

    // --- Real-time Update Handlers ---
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
    
    socketConnection.on('error', (error) => {
        console.error('Received socket application error:', error);
        alert(`Server error: ${error.message}`);
    });

    // Cleanup function to disconnect the socket when the component unmounts.
    return () => {
        console.log('Cleaning up socket connection.');
        socketConnection.disconnect();
    };
  }, []); // Empty dependency array ensures this runs only once on mount.

  const handlePasswordSubmit = async (password) => {
    if (!password) return;
    setIsDataLoading(true);
    
    try {
      const derivedRoomId = await getRoomId(password);
      const key = await deriveKey(password, derivedRoomId);
      const passwordHash = await hashPassword(password);
      
      setRoomId(derivedRoomId);
      setEncryptionKey(key);
      
      if (socket && socket.connected) {
        socket.emit('authenticate-room', { roomId: derivedRoomId, passwordHash });
      } else {
        alert('Connection is not ready. Please wait a moment and try again.');
        setIsDataLoading(false);
      }
    } catch (error) {
      console.error("Password processing failed:", error);
      alert("Could not process password. Please try again.");
      setIsDataLoading(false);
    }
  };
  
  const handleLogout = () => {
    window.location.reload();
  };

  if (!isAuthenticated) {
    // Pass loading state to the password screen to disable the form while connecting
    return <PasswordScreen onSubmit={handlePasswordSubmit} isLoading={isDataLoading} />;
  }

  return (
    <ClipboardUI
      roomId={roomId}
      encryptionKey={encryptionKey}
      clipboard={clipboard}
      socket={socket}
      connectionStatus={connectionStatus}
      onLogout={handleLogout}
    />
  );
}
