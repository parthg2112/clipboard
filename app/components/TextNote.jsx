"use client";

import { useState, useEffect, useRef } from 'react';
import { X, FileText } from 'lucide-react';
import { encrypt, decrypt } from '../lib/crypto';

export default function TextNote({ note, roomId, encryptionKey, socket }) {
  const [isEditing, setIsEditing] = useState(false);
  const [decryptedContent, setDecryptedContent] = useState('Decrypting...');
  const textareaRef = useRef(null);
  const updateTimeout = useRef(null);

  useEffect(() => {
    const decryptContent = async () => {
      if (note.content) {
        const text = await decrypt(note.content, encryptionKey);
        setDecryptedContent(text || '');
      } else {
        setDecryptedContent('');
        setIsEditing(true); // Automatically enter edit mode for new notes
      }
    };
    decryptContent();
  }, [note.content, encryptionKey]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  const handleContentChange = (e) => {
    setDecryptedContent(e.target.value);
    if (updateTimeout.current) clearTimeout(updateTimeout.current);
    updateTimeout.current = setTimeout(async () => {
      const encryptedContent = await encrypt(e.target.value, encryptionKey);
      socket.emit('update-note', { roomId, noteId: note.id, encryptedContent });
    }, 500);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this note?')) {
      socket.emit('delete-note', { roomId, noteId: note.id });
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (updateTimeout.current) clearTimeout(updateTimeout.current);
    const sendFinalUpdate = async () => {
      const encryptedContent = await encrypt(decryptedContent, encryptionKey);
      socket.emit('update-note', { roomId, noteId: note.id, encryptedContent });
    };
    sendFinalUpdate();
  };

  return (
    <div className="relative group">
      <div className="bg-gray-900/50 border border-gray-600 rounded-xl p-5 h-72 hover:border-white transition-all duration-300 flex flex-col">
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <FileText size={18} className="text-gray-400" />
          <button onClick={handleDelete} className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all duration-200">
            <X size={16} />
          </button>
        </div>
        
        <div className="flex-grow w-full">
          {isEditing ? (
            <textarea
              ref={textareaRef}
              value={decryptedContent}
              onChange={handleContentChange}
              onBlur={handleBlur}
              className="w-full h-full bg-transparent text-gray-200 resize-none focus:outline-none text-sm leading-relaxed placeholder-gray-500"
              placeholder="Enter your note..."
            />
          ) : (
            <div onClick={() => setIsEditing(true)} className="w-full h-full text-gray-300 text-sm leading-relaxed cursor-text overflow-y-auto whitespace-pre-wrap break-words">
              {decryptedContent || <span className="text-gray-500">Click to edit...</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}