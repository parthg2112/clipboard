"use client";

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, UploadCloud } from 'lucide-react';
import { encrypt } from '../lib/crypto';
import TextNote from './TextNote';
import FileCard from './FileCard';
import Lightbox from './Lightbox';
import Modal from './Modal';
import ClipboardNavbar from './ClipboardNavbar';

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

  const isConnected = connectionStatus.socket === 'connected';
  const noteCount = clipboard.textNotes?.length || 0;

  const MAX_NOTES = 4;

  const addTextNote = async () => {
    if (!isConnected) return toast.error("Cannot add note: not connected.");
    if (noteCount >= MAX_NOTES) {
      toast.error(`Maximum ${MAX_NOTES} text notes allowed.`);
      return;
    }
    try {
      // After 2nd note is added, add 2 notes at once
      const notesToAdd = noteCount >= 2 ? 2 : 1;
      const remainingSlots = MAX_NOTES - noteCount;
      const actualNotesToAdd = Math.min(notesToAdd, remainingSlots);
      
      for (let i = 0; i < actualNotesToAdd; i++) {
        const newNote = { id: (Date.now() + i).toString(), content: '' };
        const encryptedContent = await encrypt('', encryptionKey);
        newNote.content = encryptedContent;
        socket.emit('add-note', { roomId, note: newNote });
      }
    } catch (err) {
      toast.error("Could not create note.");
    }
  };

  const handleFileUpload = async (file) => {
    if (!isConnected) return toast.error("Cannot upload: not connected.");
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
    onDrop, noClick: true, noKeyboard: true, disabled: !isConnected
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

  return (
    <>
      <ClipboardNavbar
        connectionStatus={connectionStatus}
        onShare={handleShare}
        onDeleteRoom={() => setIsDeleteModalOpen(true)}
        onLogout={onLogout}
      />
      
      <div {...getRootProps()} className="flex flex-col min-h-screen w-full outline-none bg-black" style={{ paddingTop: '88px' }}>
        {isDragActive && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-md border-4 border-dashed border-cyan-400 rounded-3xl" style={{ zIndex: 10000 }}>
            <div className="text-center">
              <UploadCloud size={64} className="mx-auto text-cyan-300 animate-bounce" />
              <p className="mt-4 text-2xl font-bold text-white">Drop files to upload</p>
            </div>
          </div>
        )}

        <main className="main-container flex-grow py-8 flex flex-col">
          <div className="flex-grow flex items-stretch gap-6">
            <div className={`grid flex-grow gap-6 ${noteCount >= 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                <AnimatePresence>
                  {clipboard.textNotes?.map((note) => (
                    <TextNote key={note.id} note={note} roomId={roomId} encryptionKey={encryptionKey} socket={socket} isConnected={isConnected} />
                  ))}
                </AnimatePresence>
            </div>
            {noteCount < MAX_NOTES && (
              <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`flex-shrink-0 transition-all duration-500 ease-in-out ${noteCount > 0 ? 'w-20' : 'w-full'}`}>
                <button onClick={addTextNote} disabled={!isConnected} className="w-full h-full bg-black border-2 border-dashed border-white/20 rounded-xl hover:border-white transition-all duration-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed group">
                  <Plus size={32} className="text-gray-500 group-hover:text-white transition-colors duration-200" />
                </button>
              </motion.div>
            )}
          </div>
        </main>

        <div className="main-container flex-shrink-0 py-6 mt-auto">
          <h2 className="text-xl font-semibold text-gray-200 mb-6 tracking-wider">Files</h2>
          <div className="flex items-center gap-6 pb-4 overflow-x-auto">
            {clipboard.files?.map((file) => (
              <FileCard key={file.id} file={file} encryptionKey={encryptionKey} roomId={roomId} isConnected={isConnected} onImageClick={() => file.type?.startsWith('image/') && setLightboxImage(file.url)} />
            ))}
            {clipboard.files?.length < 8 && (
              <label className={`cursor-pointer flex-shrink-0 ${!isConnected ? 'cursor-not-allowed' : ''}`}>
                <div className={`bg-black border-2 border-dashed border-white/20 rounded-xl p-4 hover:border-white transition-all duration-300 w-44 h-40 flex items-center justify-center ${!isConnected ? 'opacity-50' : ''} group`}>
                  <Plus size={28} className="text-gray-500 group-hover:text-white transition-colors duration-200" />
                </div>
                <input type="file" className="hidden" multiple onChange={(e) => Array.from(e.target.files).forEach(handleFileUpload)} disabled={!isConnected} />
              </label>
            )}
          </div>
        </div>

        <Lightbox imageUrl={lightboxImage} onClose={() => setLightboxImage(null)} />
        <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={handleDeleteRoomConfirm} title="Delete Entire Room">
          <p>Are you sure you want to permanently delete this room?</p>
          <p className="mt-2 font-bold text-red-400">All text notes and files will be lost forever. This action cannot be undone.</p>
        </Modal>
      </div>
    </>
  );
}