"use client";

import { useState, useEffect, useRef } from 'react';
import { X, FileText, Wifi, WifiOff } from 'lucide-react';
import { encrypt, decrypt } from '../lib/crypto';

export default function TextNote({ note, roomId, encryptionKey, socket, isConnected }) {
  const [isEditing, setIsEditing] = useState(false);
  const [decryptedContent, setDecryptedContent] = useState('Decrypting...');
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef(null);
  const updateTimeout = useRef(null);
  const lastSavedContent = useRef('');

  useEffect(() => {
    const decryptContent = async () => {
      if (note.content) {
        try {
          const text = await decrypt(note.content, encryptionKey);
          setDecryptedContent(text || '');
          lastSavedContent.current = text || '';
        } catch (error) {
          console.error('Decryption failed:', error);
          setDecryptedContent('Decryption failed');
        }
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
      // Place cursor at end
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, [isEditing]);

  const handleContentChange = async (e) => {
    const newContent = e.target.value;
    setDecryptedContent(newContent);

    if (!socket || !isConnected) {
      console.warn('Cannot save: socket not connected');
      return;
    }

    // Clear existing timeout
    if (updateTimeout.current) {
      clearTimeout(updateTimeout.current);
    }

    setIsSaving(true);

    // Debounce updates (save after user stops typing for 800ms)
    updateTimeout.current = setTimeout(async () => {
      try {
        if (newContent !== lastSavedContent.current) {
          console.log(`Saving note ${note.id} via WebSocket`);
          const encryptedContent = await encrypt(newContent, encryptionKey);
          socket.emit('update-note', { roomId, noteId: note.id, encryptedContent });
          lastSavedContent.current = newContent;
        }
      } catch (error) {
        console.error('Error saving note:', error);
        alert('Failed to save note. Please try again.');
      } finally {
        setIsSaving(false);
      }
    }, 800);
  };

  const handleDelete = () => {
    if (!socket || !isConnected) {
      alert("Cannot delete: not connected to the server.");
      return;
    }

    if (window.confirm('Are you sure you want to delete this note?')) {
      console.log(`Deleting note ${note.id} via WebSocket`);
      socket.emit('delete-note', { roomId, noteId: note.id });
    }
  };

  const handleBlur = async () => {
    setIsEditing(false);
    
    // Clear any pending timeout
    if (updateTimeout.current) {
      clearTimeout(updateTimeout.current);
    }

    // Send final update immediately on blur if content changed
    if (socket && isConnected && decryptedContent !== lastSavedContent.current) {
      try {
        setIsSaving(true);
        const encryptedContent = await encrypt(decryptedContent, encryptionKey);
        socket.emit('update-note', { roomId, noteId: note.id, encryptedContent });
        lastSavedContent.current = decryptedContent;
        console.log(`Final save for note ${note.id} on blur`);
      } catch (error) {
        console.error('Error saving note on blur:', error);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleKeyDown = (e) => {
    // Save on Ctrl+S / Cmd+S
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleBlur();
    }
  };

  return (
    <div className="relative group">
      <div className="bg-gray-900/50 border border-gray-600 rounded-xl p-5 h-72 hover:border-white transition-all duration-300 flex flex-col">
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-gray-400" />
            {isSaving && (
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            )}
            {!isConnected && (
              <WifiOff size={14} className="text-red-400" title="Offline - changes won't be saved" />
            )}
          </div>
          <button 
            onClick={handleDelete} 
            disabled={!socket || !isConnected}
            className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
          >
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
              onKeyDown={handleKeyDown}
              disabled={!socket || !isConnected}
              className="w-full h-full bg-transparent text-gray-200 resize-none focus:outline-none text-sm leading-relaxed placeholder-gray-500 disabled:opacity-50"
              placeholder={isConnected ? "Enter your note..." : "Offline - cannot edit"}
            />
          ) : (
            <div 
              onClick={() => isConnected && setIsEditing(true)} 
              className={`w-full h-full text-gray-300 text-sm leading-relaxed overflow-y-auto whitespace-pre-wrap break-words ${
                isConnected ? 'cursor-text' : 'cursor-not-allowed opacity-50'
              }`}
            >
              {decryptedContent || (
                <span className="text-gray-500">
                  {isConnected ? 'Click to edit...' : 'Offline'}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Save indicator */}
        {isSaving && (
          <div className="absolute bottom-2 right-2 text-xs text-blue-400 opacity-70">
            Saving...
          </div>
        )}
      </div>
    </div>
  );
}