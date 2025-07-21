// components/ClipboardUI.jsx
"use client";

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-hot-toast';
import { Share2, LogOut, Plus, Wifi, WifiOff, Database, UploadCloud } from 'lucide-react';
import { encrypt } from '../lib/crypto';
import TextNote from './TextNote';
import FileCard from './FileCard';
import Lightbox from './Lightbox';

export default function ClipboardUI({
  roomId,
  encryptionKey,
  clipboard,
  socket,
  connectionStatus,
  onLogout
}) {
  const [lightboxImage, setLightboxImage] = useState(null);

  const addTextNote = async () => {
    if (!socket || connectionStatus.socket !== 'connected') {
      toast.error("Cannot add note: not connected.");
      return;
    }
    if (clipboard.textNotes.length >= 6) {
      toast.error('Maximum 6 text notes allowed.');
      return;
    }
    try {
      const newNote = { id: Date.now().toString(), content: '' };
      const encryptedContent = await encrypt('', encryptionKey);
      newNote.content = encryptedContent;
      socket.emit('add-note', { roomId, note: newNote });
      toast.success('New note added!');
    } catch (err) {
      toast.error("Could not create note.");
    }
  };

  const handleFileUpload = async (file) => {
    if (!socket || connectionStatus.socket !== 'connected') {
      toast.error("Cannot upload: not connected.");
      return;
    }
    if (clipboard.files.length >= 8) {
      toast.error('Maximum 8 files allowed.');
      return;
    }
    const toastId = toast.loading(`Uploading ${file.name}...`);
    try {
      const encryptedName = await encrypt(file.name, encryptionKey);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('roomId', roomId);
      formData.append('encryptedName', encryptedName);

      const response = await fetch('/api/files', { method: 'POST', body: formData });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }
      toast.success(`${file.name} uploaded!`, { id: toastId });
    } catch (error) {
      toast.error(`Upload failed: ${error.message}`, { id: toastId });
    }
  };

  const onDrop = (acceptedFiles) => {
    if (clipboard.files.length + acceptedFiles.length > 8) {
      toast.error('Maximum 8 files allowed.');
      return;
    }
    acceptedFiles.forEach(handleFileUpload);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
    disabled: connectionStatus.socket !== 'connected'
  });

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Room URL copied to clipboard!');
  };

  const isConnected = connectionStatus.socket === 'connected';
  const isMongoConnected = connectionStatus.mongodb === 'connected';

  return (
    <div {...getRootProps()} className="min-h-screen bg-black text-white p-6 sm:p-8 md:p-12 w-full outline-none">
      <input {...getInputProps()} />

      {isDragActive && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-md border-4 border-dashed border-cyan-400 rounded-3xl">
          <div className="text-center">
            <UploadCloud size={64} className="mx-auto text-cyan-300 animate-bounce" />
            <p className="mt-4 text-2xl font-bold text-white">Drop files to upload</p>
          </div>
        </div>
      )}

      <header className="flex justify-between items-center mb-16">
        <div>
          <h1 className="text-2xl font-bold tracking-wide mb-2">Live Clipboard</h1>
          <div className="flex items-center gap-4 text-xs">
            <div className={`flex items-center gap-1 ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
              {isConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
              <span>Socket: {connectionStatus.socket}</span>
            </div>
            <div className={`flex items-center gap-1 ${isMongoConnected ? 'text-green-400' : 'text-red-400'}`}>
              <Database size={12} />
              <span>Database: {connectionStatus.mongodb}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6 sm:gap-8">
          <button onClick={handleShare} className="flex items-center gap-3 text-gray-300 hover:text-white transition-colors duration-200">
            <Share2 size={18} />
            <span className="text-sm font-medium hidden sm:inline">Share</span>
          </button>
          <button onClick={onLogout} className="flex items-center gap-3 text-gray-300 hover:text-white transition-colors duration-200">
            <LogOut size={18} />
            <span className="text-sm font-medium hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      <section className="mb-20">
        <h2 className="text-lg font-medium text-gray-300 mb-8 tracking-wider">Text Notes ({clipboard.textNotes?.length || 0}/6)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl">
          {clipboard.textNotes?.map((note) => (
            <TextNote key={note.id} note={note} roomId={roomId} encryptionKey={encryptionKey} socket={socket} isConnected={isConnected} />
          ))}
          {clipboard.textNotes?.length < 6 && (
            <button onClick={addTextNote} disabled={!isConnected} className="w-full h-72 bg-gray-900/30 border-2 border-dashed border-gray-600 rounded-xl hover:border-white hover:bg-gray-900/50 transition-all duration-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed group">
              <Plus size={32} className="text-gray-500 group-hover:text-white transition-colors duration-200" />
            </button>
          )}
          {clipboard.textNotes?.length === 0 && clipboard.textNotes?.length < 6 && (
             <div className="md:col-span-2 lg:col-span-3 text-center py-16 text-gray-500">
                <p>Your clipboard is empty.</p>
                <p>Add a note to get started!</p>
            </div>
          )}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-lg font-medium text-gray-300 mb-8 tracking-wider">Files ({clipboard.files?.length || 0}/8)</h2>
        <div className="flex flex-wrap gap-6 max-w-7xl">
          {clipboard.files?.map((file) => (
            <FileCard key={file.id} file={file} encryptionKey={encryptionKey} roomId={roomId} isConnected={isConnected} onImageClick={() => file.type?.startsWith('image/') && setLightboxImage(file.url)} />
          ))}
          {clipboard.files?.length < 8 && (
            <label className={`cursor-pointer ${!isConnected ? 'cursor-not-allowed' : ''}`}>
              <div className={`bg-gray-900/30 border-2 border-dashed border-gray-600 rounded-xl p-4 hover:border-white hover:bg-gray-900/50 transition-all duration-300 w-44 h-40 flex items-center justify-center ${!isConnected ? 'opacity-50' : ''} group`}>
                <Plus size={28} className="text-gray-500 group-hover:text-white transition-colors duration-200" />
              </div>
              <input type="file" className="hidden" multiple onChange={(e) => Array.from(e.target.files).forEach(handleFileUpload)} disabled={!isConnected} />
            </label>
          )}
          {clipboard.files?.length === 0 && clipboard.files?.length < 8 && (
             <div className="w-full text-center py-16 text-gray-500">
                <p>No files uploaded yet.</p>
                <p>Drag & drop files here to upload.</p>
            </div>
          )}
        </div>
      </section>

      <Lightbox imageUrl={lightboxImage} onClose={() => setLightboxImage(null)} />

      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-gray-800 p-3 rounded text-xs max-w-xs">
          <div>Room: {roomId?.substring(0, 8)}...</div>
          <div>Notes: {clipboard.textNotes?.length || 0}</div>
          <div>Files: {clipboard.files?.length || 0}</div>
          <div>Socket: {socket?.id?.substring(0, 8) || 'None'}</div>
        </div>
      )}
    </div>
  );
}
