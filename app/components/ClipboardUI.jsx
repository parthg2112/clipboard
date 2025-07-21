"use client";

import { Share2, LogOut, Plus } from 'lucide-react';
import { encrypt } from '../lib/crypto';
import TextNote from './TextNote';
import FileCard from './FileCard';

export default function ClipboardUI({ roomId, encryptionKey, clipboard, socket, onLogout }) {

  const addTextNote = () => {
    if (!socket) {
      console.error("Socket is not available. Cannot add note.");
      return;
    }
    if (clipboard.textNotes.length >= 6) {
      alert('Maximum 6 text notes allowed');
      return;
    }
    const newNote = { id: Date.now().toString(), content: '' };
    encrypt('', encryptionKey)
      .then(encryptedContent => {
        newNote.content = encryptedContent;
        socket.emit('add-note', { roomId, note: newNote });
      })
      .catch(err => {
        console.error("An error occurred during note encryption:", err);
        alert("Could not create note due to an encryption error.");
      });
  };

  const handleFileUpload = async (event) => {
    if (!socket) {
        alert("Cannot upload file: not connected to the server.");
        return;
    }
    const file = event.target.files[0];
    if (!file) return;
    if (clipboard.files.length >= 8) {
      alert('Maximum 8 images/files allowed');
      return;
    }
    const encryptedName = await encrypt(file.name, encryptionKey);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('roomId', roomId);
    formData.append('encryptedName', encryptedName);
    try {
      const response = await fetch('/api/files', { method: 'POST', body: formData });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }
    } catch (error) {
      alert(`File upload failed: ${error.message}`);
      console.error('Upload error:', error);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Room URL copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 sm:p-8 md:p-12 w-full">
      <header className="flex justify-between items-center mb-16">
        <h1 className="text-2xl font-bold tracking-wide">Live Clipboard</h1>
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
        <h2 className="text-lg font-medium text-gray-300 mb-8 tracking-wider">Text Notes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl">
          {clipboard.textNotes?.map((note) => (
            <TextNote key={note.id} note={note} roomId={roomId} encryptionKey={encryptionKey} socket={socket} />
          ))}
          {clipboard.textNotes?.length < 6 && (
            <div className="relative group">
              <button 
                onClick={addTextNote} 
                disabled={!socket}
                className="w-full h-72 bg-gray-900/30 border-2 border-dashed border-gray-600 rounded-xl hover:border-white hover:bg-gray-900/50 transition-all duration-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={32} className="text-gray-500 group-hover:text-white transition-colors duration-200" />
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-lg font-medium text-gray-300 mb-8 tracking-wider">Files</h2>
        <div className="flex flex-wrap gap-6 max-w-7xl">
          {clipboard.files?.map((file) => (
            <FileCard key={file.id} file={file} encryptionKey={encryptionKey} roomId={roomId} />
          ))}
          {clipboard.files?.length < 8 && (
            <div className="relative group">
              <label className="cursor-pointer">
                <div className="bg-gray-900/30 border-2 border-dashed border-gray-600 rounded-xl p-4 hover:border-white hover:bg-gray-900/50 transition-all duration-300 w-44 h-40 flex items-center justify-center">
                  <Plus size={28} className="text-gray-500 group-hover:text-white transition-colors duration-200" />
                </div>
                <input type="file" className="hidden" accept="image/*,application/pdf,.doc,.docx" onChange={handleFileUpload} disabled={!socket} />
              </label>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}