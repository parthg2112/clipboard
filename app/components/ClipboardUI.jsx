"use client";

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-hot-toast';
import { Share2, LogOut, Plus, Wifi, WifiOff, Database, UploadCloud, Trash2 } from 'lucide-react';
import { encrypt } from '../lib/crypto';
import TextNote from './TextNote';
import FileCard from './FileCard';
import Lightbox from './Lightbox';
import Modal from './Modal'; // Assuming Modal.jsx exists

export default function ClipboardUI({
  roomId,
  encryptionKey,
  clipboard,
  socket,
  connectionStatus,
  onLogout
}) {
  const [lightboxImage, setLightboxImage] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const addTextNote = async () => {
    if (!socket || !isConnected) {
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
    if (!socket || !isConnected) {
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
  
  const handleDeleteRoomConfirm = () => {
    if (socket && isConnected) {
        toast.loading('Deleting room...');
        socket.emit('delete-room', { roomId });
    } else {
        toast.error('Cannot delete room: not connected.');
    }
    setIsDeleteModalOpen(false);
  };

  const isConnected = connectionStatus.socket === 'connected';

  return (
    <div {...getRootProps()} className="w-full outline-none">
      {isDragActive && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-md border-4 border-dashed border-cyan-400 rounded-3xl">
          <div className="text-center">
            <UploadCloud size={64} className="mx-auto text-cyan-300 animate-bounce" />
            <p className="mt-4 text-2xl font-bold text-white">Drop files to upload</p>
          </div>
        </div>
      )}

      <div className="main-container py-8 sm:py-12">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-12">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-wide mb-2">Live Clipboard</h1>
            <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-xs">
              <div className={`flex items-center gap-1.5 ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
                <span>Socket: {connectionStatus.socket}</span>
              </div>
              <div className={`flex items-center gap-1.5 ${connectionStatus.mongodb === 'connected' ? 'text-green-400' : 'text-red-400'}`}>
                <Database size={14} />
                <span>Database: {connectionStatus.mongodb}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
            <button onClick={handleShare} className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors duration-200">
              <Share2 size={18} />
              <span className="text-sm font-medium">Share</span>
            </button>
            {/* ADDED: Delete Room Button */}
            <button onClick={() => setIsDeleteModalOpen(true)} className="flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors duration-200">
              <Trash2 size={18} />
              <span className="text-sm font-medium">Delete Room</span>
            </button>
            <button onClick={onLogout} className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors duration-200">
              <LogOut size={18} />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </header>

        {/* The rest of the component remains the same */}
        <section className="mb-16">
          <h2 className="text-xl font-semibold text-gray-200 mb-6 tracking-wider">
            Text Notes
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {clipboard.textNotes?.map((note) => (
              <TextNote key={note.id} note={note} roomId={roomId} encryptionKey={encryptionKey} socket={socket} isConnected={isConnected} />
            ))}
            {clipboard.textNotes?.length < 6 && (
              <button onClick={addTextNote} disabled={!isConnected} className="w-full h-72 bg-white/5 border-2 border-dashed border-white/20 rounded-xl hover:border-white hover:bg-white/10 transition-all duration-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed group">
                <Plus size={32} className="text-gray-500 group-hover:text-white transition-colors duration-200" />
              </button>
            )}
            {clipboard.textNotes?.length === 0 && clipboard.textNotes?.length < 6 && (
               <div className="lg:col-span-2 xl:col-span-3 text-center py-16 text-gray-500">
                  <p>Your clipboard is empty.</p>
                  <p>Add a note to get started!</p>
              </div>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-200 mb-6 tracking-wider">
            Files
          </h2>
          <div className="flex flex-wrap gap-6">
            {clipboard.files?.map((file) => (
              <FileCard key={file.id} file={file} encryptionKey={encryptionKey} roomId={roomId} isConnected={isConnected} onImageClick={() => file.type?.startsWith('image/') && setLightboxImage(file.url)} />
            ))}
            {clipboard.files?.length < 8 && (
              <label className={`cursor-pointer ${!isConnected ? 'cursor-not-allowed' : ''}`}>
                <div className={`bg-white/5 border-2 border-dashed border-white/20 rounded-xl p-4 hover:border-white hover:bg-white/10 transition-all duration-300 w-44 h-40 flex items-center justify-center ${!isConnected ? 'opacity-50' : ''} group`}>
                  <Plus size={28} className="text-gray-500 group-hover:text-white transition-colors duration-200" />
                </div>
                <input type="file" className="hidden" multiple onChange={(e) => Array.from(e.target.files).forEach(handleFileUpload)} disabled={!isConnected} />
              </label>
            )}
            {clipboard.files?.length === 0 && clipboard.files?.length < 8 && (
               <div className="w-full text-center py-16 text-gray-500">
                  <p>No files uploaded yet.</p>
                  <p>Drag & drop anywhere to upload.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <Lightbox imageUrl={lightboxImage} onClose={() => setLightboxImage(null)} />
      
      {/* ADDED: Delete Room Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteRoomConfirm}
        title="Delete Entire Room"
      >
        <p>Are you sure you want to permanently delete this room?</p>
        <p className="mt-2 font-bold text-red-400">All text notes and files will be lost forever. This action cannot be undone.</p>
      </Modal>
    </div>
  );
}
