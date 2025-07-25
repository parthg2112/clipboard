"use client";

import { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, UploadCloud } from 'lucide-react';
import { encrypt, encryptFile } from '../lib/crypto'
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
  const [selectedImageId, setSelectedImageId] = useState(null);

  const isConnected = connectionStatus.socket === 'connected';
  const noteCount = clipboard.textNotes?.length || 0;

  const MAX_NOTES = 4;

  // Keyboard shortcuts and focus handling
  useEffect(() => {
    // Ensure the container can receive focus for keyboard events
    const container = document.getElementById('clipboard-container');
    if (container) {
      container.focus();
    }

    const handleKeyDown = async (e) => {
      // Prevent shortcuts when user is typing in input fields
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        return;
      }

      // Ctrl+V for pasting images
      if (e.ctrlKey && e.key === 'v') {
        e.preventDefault();
        if (!isConnected) {
          toast.error("Cannot paste: not connected.");
          return;
        }
        if (clipboard.files.length >= 8) {
          toast.error('Maximum 8 files allowed.');
          return;
        }

        try {
          const clipboardItems = await navigator.clipboard.read();
          let hasImage = false;

          for (const clipboardItem of clipboardItems) {
            for (const type of clipboardItem.types) {
              if (type.startsWith('image/')) {
                const blob = await clipboardItem.getType(type);
                const file = new File([blob], `pasted-image-${Date.now()}.png`, { type });
                handleFileUpload(file);
                hasImage = true;
                return;
              }
            }
          }

          if (!hasImage) {
            toast.error('No image data in clipboard. Try taking a screenshot or copying an image directly from a webpage instead of a file from explorer.');
          }
        } catch (error) {
          console.error('Clipboard access error:', error);
          toast.error('Could not access clipboard. Make sure to allow clipboard permissions.');
        }
      }

      // Ctrl+C for copying selected image
      // if (e.ctrlKey && e.key === 'c' && selectedImageId) {
      //   e.preventDefault();
      //   const selectedImage = clipboard.files?.find(file => file.id === selectedImageId);
      //   if (selectedImage && selectedImage.type?.startsWith('image/')) {
      //     try {
      //       // Check if ClipboardItem and write are supported
      //       if (typeof ClipboardItem !== 'undefined' && navigator.clipboard.write) {
      //         const response = await fetch(selectedImage.url);
      //         const blob = await response.blob();
      //         await navigator.clipboard.write([
      //           new ClipboardItem({
      //             [blob.type]: blob
      //           })
      //         ]);
      //         toast.success('Image copied to clipboard!');
      //       } else {
      //         // Fallback: copy the image URL as text
      //         await navigator.clipboard.writeText(selectedImage.url);
      //         toast.success('Image URL copied to clipboard!');
      //       }
      //     } catch (error) {
      //       console.error('Copy error:', error);
      //       // Final fallback: try copying URL as text
      //       try {
      //         await navigator.clipboard.writeText(selectedImage.url);
      //         toast.success('Image URL copied to clipboard!');
      //       } catch (fallbackError) {
      //         toast.error('Copy not supported in this browser');
      //       }
      //     }
      //   }
      // }

      // Delete key for removing selected image
      if (e.key === 'Delete' && selectedImageId) {
        e.preventDefault();
        const selectedImage = clipboard.files?.find(file => file.id === selectedImageId);
        if (selectedImage && selectedImage.type?.startsWith('image/')) {
          handleDeleteImage(selectedImageId);
        }
      }
    };

    // Add event listener to document for global keyboard shortcuts
    document.addEventListener('keydown', handleKeyDown);

    // Focus the container when component mounts
    const focusContainer = () => {
      const container = document.getElementById('clipboard-container');
      if (container) {
        container.focus();
      }
    };

    // Focus immediately and on window focus
    focusContainer();
    window.addEventListener('focus', focusContainer);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('focus', focusContainer);
    };
  }, [isConnected, clipboard.files, selectedImageId, roomId]);

  // Handle image deletion
  const handleDeleteImage = async (imageId) => {
    if (!isConnected) {
      toast.error("Cannot delete: not connected.");
      return;
    }

    try {
      const response = await fetch(`/api/files?roomId=${roomId}&fileId=${imageId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Delete failed');
      }

      toast.success('Image deleted');
      setSelectedImageId(null);
    } catch (error) {
      toast.error(`Delete failed: ${error.message}`);
    }
  };

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

    const MAX_FILE_SIZE = 100 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`File too large. Maximum allowed size is 100MB`);
      return;
    }

    const toastId = toast.loading(`Encrypting & uploading ${file.name}...`);
    try {
      // 1. Encrypt the filename (as before)
      const encryptedName = await encrypt(file.name, encryptionKey);

      // 2. ✅ Encrypt the file content
      const fileBuffer = await file.arrayBuffer();
      const encryptedBlob = await encryptFile(fileBuffer, encryptionKey);

      // 3. Create a new File object with the encrypted content
      const encryptedFile = new File([encryptedBlob], file.name, { type: 'application/octet-stream' });

      // 4. Upload the encrypted file
      const formData = new FormData();
      formData.append('file', encryptedFile); // Send the encrypted file
      formData.append('roomId', roomId);
      formData.append('encryptedName', encryptedName);
      // We still send the original file type for the icon display
      formData.append('originalType', file.type);

      const response = await fetch('/api/files', { method: 'POST', body: formData });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }
      toast.success(`${file.name} uploaded!`, { id: toastId });
    } catch (error) {
      console.error("Upload error:", error);
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

  const handleImageClick = (decryptedUrl, imageId) => {
    setLightboxImage(decryptedUrl);
    setSelectedImageId(imageId);
  };

  return (
    <>
      <ClipboardNavbar
        connectionStatus={connectionStatus}
        onShare={handleShare}
        onDeleteRoom={() => setIsDeleteModalOpen(true)}
        onLogout={onLogout}
      />

      <div
        id="clipboard-container"
        {...getRootProps()}
        className="flex flex-col min-h-screen w-full outline-none"
        style={{ paddingTop: '88px', paddingLeft: '10px', paddingRight: '10px' }}
        tabIndex={0}
      >
        {isDragActive && (
          <div className="fixed inset-0 flex items-center justify-center bg-opacity-70 backdrop-blur-md border-4 border-dashed border-cyan-400 rounded-3xl" style={{ zIndex: 10000 }}>
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
                <button onClick={addTextNote} disabled={!isConnected} className="w-full h-full rounded-xl transition-all duration-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed group backdrop-blur-[10px] border border-white/10 hover:bg-white/10 shadow-[0_0_5px_rgba(255,255,255,0.15)] hover:shadow-[0_0_10px_rgba(255,255,255,0.25)]">
                  <Plus size={32} className="text-gray-500 group-hover:text-white transition-colors duration-200" />
                </button>
              </motion.div>
            )}
          </div>
        </main>

        <div className="main-container flex-shrink-0 py-6 mt-auto">
          <h2 className="text-xl font-semibold text-gray-200 mb-6 tracking-wider">Files</h2>
          <div className="flex items-center gap-6 pb-4 overflow-x-auto px-1 pt-1">
            {clipboard.files?.map((file) => (
              <div
                key={file.id}
                className={`flex-shrink-0 ${selectedImageId === file.id && file.type?.startsWith('image/') ? 'ring-2 ring-cyan-400 rounded-xl' : ''}`}
                onClick={() => file.type?.startsWith('image/') && setSelectedImageId(file.id)}
              >
                <FileCard
                  file={file}
                  encryptionKey={encryptionKey}
                  roomId={roomId}
                  isConnected={isConnected}
                  onImageClick={handleImageClick}
                />
              </div>
            ))}
            {clipboard.files?.length < 8 && (
              <label className={`cursor-pointer flex-shrink-0 ${!isConnected ? 'cursor-not-allowed' : ''}`}>
                <div className={`rounded-xl p-4 transition-all duration-300 w-44 h-40 flex items-center justify-center ${!isConnected ? 'opacity-50' : ''} group backdrop-blur-[10px] border border-white/10 hover:bg-white/10 shadow-[0_0_5px_rgba(255,255,255,0.15)] hover:shadow-[0_0_10px_rgba(255,255,255,0.25)]`}>
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