"use client";

import { Share2, LogOut, Plus, Wifi, WifiOff, Database } from 'lucide-react';
import { encrypt } from '../lib/crypto';
import TextNote from './TextNote';
import FileCard from './FileCard';

export default function ClipboardUI({ 
  roomId, 
  encryptionKey, 
  clipboard, 
  socket, 
  connectionStatus,
  onLogout 
}) {

  const addTextNote = async () => {
    if (!socket || connectionStatus.socket !== 'connected') {
      alert("Cannot add note: not connected to the server.");
      return;
    }
    
    if (clipboard.textNotes.length >= 6) {
      alert('Maximum 6 text notes allowed');
      return;
    }
    
    try {
      const newNote = { 
        id: Date.now().toString(), 
        content: '' 
      };
      
      const encryptedContent = await encrypt('', encryptionKey);
      newNote.content = encryptedContent;
      
      console.log('Adding new note:', newNote.id);
      socket.emit('add-note', { roomId, note: newNote });
      
    } catch (err) {
      console.error("Error creating note:", err);
      alert("Could not create note due to an encryption error.");
    }
  };

  const handleFileUpload = async (event) => {
    if (!socket || connectionStatus.socket !== 'connected') {
      alert("Cannot upload file: not connected to the server.");
      return;
    }
    
    const file = event.target.files[0];
    if (!file) return;
    
    if (clipboard.files.length >= 8) {
      alert('Maximum 8 images/files allowed');
      return;
    }
    
    try {
      const encryptedName = await encrypt(file.name, encryptionKey);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('roomId', roomId);
      formData.append('encryptedName', encryptedName);
      
      console.log('Uploading file:', file.name);
      
      const response = await fetch('/api/files', { 
        method: 'POST', 
        body: formData 
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }
      
      console.log('File uploaded successfully');
      
    } catch (error) {
      alert(`File upload failed: ${error.message}`);
      console.error('Upload error:', error);
    }
    
    // Clear the input
    event.target.value = '';
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Room URL copied to clipboard!');
  };

  const isConnected = connectionStatus.socket === 'connected';
  const isMongoConnected = connectionStatus.mongodb === 'connected';

  return (
    <div className="min-h-screen bg-black text-white p-6 sm:p-8 md:p-12 w-full">
      <header className="flex justify-between items-center mb-16">
        <div>
          <h1 className="text-2xl font-bold tracking-wide mb-2">Live Clipboard</h1>
          
          {/* Connection Status */}
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              {isConnected ? (
                <Wifi size={12} className="text-green-400" />
              ) : (
                <WifiOff size={12} className="text-red-400" />
              )}
              <span className={isConnected ? 'text-green-400' : 'text-red-400'}>
                Socket: {connectionStatus.socket}
              </span>
            </div>
            
            <div className="flex items-center gap-1">
              <Database size={12} className={
                isMongoConnected ? 'text-green-400' : 
                connectionStatus.mongodb === 'failed' ? 'text-red-400' : 'text-yellow-400'
              } />
              <span className={
                isMongoConnected ? 'text-green-400' : 
                connectionStatus.mongodb === 'failed' ? 'text-red-400' : 'text-yellow-400'
              }>
                Database: {connectionStatus.mongodb}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-6 sm:gap-8">
          <button 
            onClick={handleShare} 
            className="flex items-center gap-3 text-gray-300 hover:text-white transition-colors duration-200"
          >
            <Share2 size={18} />
            <span className="text-sm font-medium hidden sm:inline">Share</span>
          </button>
          <button 
            onClick={onLogout} 
            className="flex items-center gap-3 text-gray-300 hover:text-white transition-colors duration-200"
          >
            <LogOut size={18} />
            <span className="text-sm font-medium hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      <section className="mb-20">
        <h2 className="text-lg font-medium text-gray-300 mb-8 tracking-wider">
          Text Notes ({clipboard.textNotes?.length || 0}/6)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl">
          {clipboard.textNotes?.map((note) => (
            <TextNote 
              key={note.id} 
              note={note} 
              roomId={roomId} 
              encryptionKey={encryptionKey} 
              socket={socket} 
              isConnected={isConnected}
            />
          ))}
          {clipboard.textNotes?.length < 6 && (
            <div className="relative group">
              <button 
                onClick={addTextNote} 
                disabled={!isConnected}
                className="w-full h-72 bg-gray-900/30 border-2 border-dashed border-gray-600 rounded-xl hover:border-white hover:bg-gray-900/50 transition-all duration-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={32} className="text-gray-500 group-hover:text-white transition-colors duration-200" />
              </button>
              {!isConnected && (
                <div className="absolute bottom-2 left-2 text-xs text-red-400">
                  Offline
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-lg font-medium text-gray-300 mb-8 tracking-wider">
          Files ({clipboard.files?.length || 0}/8)
        </h2>
        <div className="flex flex-wrap gap-6 max-w-7xl">
          {clipboard.files?.map((file) => (
            <FileCard 
              key={file.id} 
              file={file} 
              encryptionKey={encryptionKey} 
              roomId={roomId}
              isConnected={isConnected}
            />
          ))}
          {clipboard.files?.length < 8 && (
            <div className="relative group">
              <label className={`cursor-pointer ${!isConnected ? 'cursor-not-allowed' : ''}`}>
                <div className={`bg-gray-900/30 border-2 border-dashed border-gray-600 rounded-xl p-4 hover:border-white hover:bg-gray-900/50 transition-all duration-300 w-44 h-40 flex items-center justify-center ${
                  !isConnected ? 'opacity-50' : ''
                }`}>
                  <Plus size={28} className="text-gray-500 group-hover:text-white transition-colors duration-200" />
                </div>
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*,application/pdf,.doc,.docx" 
                  onChange={handleFileUpload} 
                  disabled={!isConnected} 
                />
              </label>
              {!isConnected && (
                <div className="absolute bottom-2 left-2 text-xs text-red-400">
                  Offline
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Debug Info (remove in production) */}
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