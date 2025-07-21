// components/TextNote.jsx
"use client";

import { useState, useEffect, useRef } from 'react';
import { X, FileText, Loader } from 'lucide-react';
import { encrypt, decrypt } from '../lib/crypto';
import { toast } from 'react-hot-toast';
import Modal from './Modal';

export default function TextNote({ note, roomId, encryptionKey, socket, isConnected }) {
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
      <div className="relative group">
        <div className="bg-gray-900/50 border border-gray-600 rounded-xl p-5 h-72 hover:border-white transition-all duration-300 flex flex-col">
          <div className="flex justify-between items-center mb-4 flex-shrink-0">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-gray-400" />
              {isSaving && <Loader size={16} className="text-blue-400 animate-spin" />}
            </div>
            <button onClick={() => setIsModalOpen(true)} disabled={!isConnected} className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all duration-200 disabled:opacity-30">
              <X size={16} />
            </button>
          </div>
          <textarea
            value={decryptedContent}
            onChange={handleContentChange}
            disabled={!isConnected}
            className="w-full h-full bg-transparent text-gray-200 resize-none focus:outline-none text-sm leading-relaxed placeholder-gray-500 disabled:opacity-50"
            placeholder={isConnected ? "Enter your note..." : "Offline - cannot edit"}
          />
        </div>
      </div>
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Note"
      >
        <p>Are you sure you want to permanently delete this note?</p>
      </Modal>
    </>
  );
}
