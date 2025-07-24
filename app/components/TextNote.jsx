// components/TextNote.jsx
"use client";

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, FileText, Loader } from 'lucide-react';
import { encrypt, decrypt } from '../lib/crypto';
import { toast } from 'react-hot-toast';
import Modal from './Modal';

export default function TextNote({ note, roomId, encryptionKey, socket, isConnected, className }) {
  const [decryptedContent, setDecryptedContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const updateTimeout = useRef(null);

  useEffect(() => {
    const decryptContent = async () => {
      try {
        const text = await decrypt(note.content, encryptionKey);
        setDecryptedContent(text || '');
      } catch (error) {
        setDecryptedContent('Decryption failed');
      }
    };
    decryptContent();
  }, [note.content, encryptionKey]);

  const handleContentChange = (e) => {
    const newContent = e.target.value;
    setDecryptedContent(newContent);
    if (!isConnected) return;
    setIsSaving(true);
    if (updateTimeout.current) clearTimeout(updateTimeout.current);
    updateTimeout.current = setTimeout(async () => {
      try {
        const encryptedContent = await encrypt(newContent, encryptionKey);
        socket.emit('update-note', { roomId, noteId: note.id, encryptedContent });
      } catch (error) {
        toast.error('Failed to save note.');
      } finally {
        setIsSaving(false);
      }
    }, 800);
  };

  const handleDeleteConfirm = () => {
    setIsModalOpen(false);
    if (!isConnected) {
      toast.error("Cannot delete: not connected.");
      return;
    }
    socket.emit('delete-note', { roomId, noteId: note.id });
    toast.success('Note deleted!');
  };

  return (
    <>
      <motion.div 
        layout
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={`relative group h-full ${className}`}
      >
        {/* FIX: Styles for this div are restored to their original values */}
        <div className="bg-black border border-white rounded-xl p-6 h-full transition-all duration-300 flex flex-col shadow-[0_0_15px_rgba(255,255,255,0.3)] hover:shadow-[0_0_25px_rgba(255,255,255,0.5)]">
          <div className="flex justify-between items-center mb-5 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-1.5">
                <FileText size={18} className="text-gray-400" />
              </div>
              {isSaving && <Loader size={16} className="text-blue-400 animate-spin" />}
            </div>
            {/* FIX: Removed only `opacity-0` and `group-hover:opacity-100` to make button visible on mobile */}
            <button onClick={() => setIsModalOpen(true)} disabled={!isConnected} className="text-gray-500 hover:text-red-400 transition-all duration-200 disabled:opacity-30 p-2 rounded-md hover:bg-white/5">
              <X size={16} />
            </button>
          </div>
          <textarea
            value={decryptedContent}
            onChange={handleContentChange}
            disabled={!isConnected}
            className="w-full flex-grow bg-transparent text-gray-200 resize-none focus:outline-none text-sm leading-relaxed placeholder-gray-500 disabled:opacity-50 px-2 py-3"
            placeholder={isConnected ? "Enter your note..." : "Offline - cannot edit"}
          />
        </div>
      </motion.div>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onConfirm={handleDeleteConfirm} title="Delete Note">
        <p>Are you sure you want to permanently delete this note?</p>
      </Modal>
    </>
  );
}