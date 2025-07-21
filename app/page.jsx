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

  // Effect to initialize and manage the WebSocket connection.
  useEffect(() => {
    // This fetch call is a workaround to ensure the Next.js API route
    // that initializes the Socket.IO server is triggered.
    fetch('/api/socket').finally(() => {
      // Once the server is expected to be running, establish the connection.
      const socketConnection = io({
        path: '/api/socket',
        transports: ['websocket'], // Prioritize WebSocket for TCP connection
      });

      // --- Socket Event Listeners ---
      socketConnection.on('connect', () => {
        console.log('Socket connected:', socketConnection.id);
        setSocket(socketConnection);
        setConnectionStatus(prev => ({ ...prev, socket: 'connected' }));
        // Immediately test the database connection upon connecting.
        socketConnection.emit('test-connection');
      });

      socketConnection.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        setSocket(null);
        setIsAuthenticated(false); // Assume re-authentication is needed
        setConnectionStatus({ socket: 'disconnected', mongodb: 'unknown' });
      });

      socketConnection.on('connect_error', (error) => {
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
        // Reset state to force user back to the password screen
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
        console.log('Real-time: Note added');
        setClipboard(prev => ({ ...prev, textNotes: [...prev.textNotes, newNote] }));
      });

      socketConnection.on('note-updated', ({ noteId, encryptedContent }) => {
        console.log('Real-time: Note updated');
        setClipboard(prev => ({
          ...prev,
          textNotes: prev.textNotes.map(n => n.id === noteId ? { ...n, content: encryptedContent, updatedAt: new Date() } : n)
        }));
      });

      socketConnection.on('note-deleted', (noteId) => {
        console.log('Real-time: Note deleted');
        setClipboard(prev => ({ ...prev, textNotes: prev.textNotes.filter(n => n.id !== noteId) }));
      });

      socketConnection.on('file-added', (newFile) => {
        console.log('Real-time: File added');
        setClipboard(prev => ({ ...prev, files: [...prev.files, newFile] }));
      });

      socketConnection.on('file-deleted', (fileId) => {
        console.log('Real-time: File deleted');
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
    });
  }, []); // Empty dependency array ensures this runs only once on mount.

  // --- Handler Functions ---
  const handlePasswordSubmit = async (password) => {
    if (!password) return;
    setIsDataLoading(true);
    
    try {
      console.log('Processing password...');
      const derivedRoomId = await getRoomId(password);
      const key = await deriveKey(password, derivedRoomId);
      const passwordHash = await hashPassword(password);
      
      setRoomId(derivedRoomId);
      setEncryptionKey(key);
      
      if (socket && socket.connected) {
        console.log('Authenticating with server...');
        socket.emit('authenticate-room', { roomId: derivedRoomId, passwordHash });
      } else {
        console.error('Socket not connected, cannot authenticate.');
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
    // A full page reload is the most reliable way to reset all state.
    window.location.reload();
  };

  // --- Conditional Rendering ---
  if (!isAuthenticated) {
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
