"use client";

import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { deriveKey, getRoomId } from './lib/crypto';
import PasswordScreen from './components/PasswordScreen';
import ClipboardUI from './components/ClipboardUI';

let socket;

export default function HomePage() {
  const [roomId, setRoomId] = useState(null);
  const [encryptionKey, setEncryptionKey] = useState(null);
  const [clipboard, setClipboard] = useState({ text: '', files: [] });
  const [isDataLoading, setIsDataLoading] = useState(true);

  // Initialize socket connection
  useEffect(() => {
    const initSocket = async () => {
      await fetch('/api/socket');
      socket = io({ path: '/api/socket' });

      socket.on('connect', () => {
        console.log('Connected to socket server');
      });

      socket.on('load-data', (data) => {
        setClipboard(data);
        setIsDataLoading(false);
      });

      socket.on('receive-text-update', (encryptedText) => {
        setClipboard(prev => ({ ...prev, text: encryptedText }));
      });

      socket.on('receive-file-update', (newFile) => {
        setClipboard(prev => ({ ...prev, files: [...prev.files, newFile] }));
      });
      
      socket.on('receive-file-delete', (fileId) => {
        setClipboard(prev => ({ ...prev, files: prev.files.filter(f => f.id !== fileId) }));
      });
    };
    initSocket();

    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (socket && roomId) {
      socket.emit('join-room', roomId);
    }
  }, [roomId]);

  const handlePasswordSubmit = async (password) => {
    if (!password) return;
    try {
      const derivedRoomId = await getRoomId(password);
      const key = await deriveKey(password, derivedRoomId); // Use roomId as salt
      setEncryptionKey(key);
      setRoomId(derivedRoomId);
    } catch (error) {
      console.error("Key derivation failed:", error);
      alert("Could not process password.");
    }
  };
  
  const handleLogout = () => {
    setEncryptionKey(null);
    setRoomId(null);
    setClipboard({ text: '', files: [] });
    setIsDataLoading(true);
  };

  if (!encryptionKey || !roomId) {
    return <PasswordScreen onSubmit={handlePasswordSubmit} />;
  }

  return (
    <ClipboardUI
      roomId={roomId}
      encryptionKey={encryptionKey}
      clipboard={clipboard}
      setClipboard={setClipboard}
      socket={socket}
      onLogout={handleLogout}
      isDataLoading={isDataLoading}
    />
  );
}
