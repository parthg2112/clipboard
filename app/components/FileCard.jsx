"use client";

import { useState, useEffect } from 'react';
import { decrypt } from '../lib/crypto';
import { Download, X, File as FileIcon } from 'lucide-react';

export default function FileCard({ file, encryptionKey, roomId }) {
  const [decryptedName, setDecryptedName] = useState('...');
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const decryptName = async () => {
      const name = await decrypt(file.name, encryptionKey);
      setDecryptedName(name || 'Decryption Failed');
    };
    decryptName();
  }, [file.name, encryptionKey]);
  
  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this file?")) return;
    try {
      const response = await fetch(`/api/files?roomId=${roomId}&fileId=${file.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Delete failed');
    } catch (error) {
      console.error("Error deleting file:", error);
      alert("Could not delete file.");
    }
  };

  const isImage = file.type?.startsWith('image/');

  return (
    <div 
      className="relative group w-44"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="bg-gray-900/50 border border-gray-600 rounded-xl p-3 hover:border-white transition-all duration-300 w-full h-40 flex flex-col">
        <div className="flex justify-end items-start mb-2 flex-shrink-0">
          <button 
            onClick={handleDelete} 
            className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all duration-200 p-1"
          >
            <X size={14} />
          </button>
        </div>
        
        <div className="w-full flex-grow bg-gray-800 rounded-lg mb-2 overflow-hidden flex items-center justify-center">
          {isImage ? (
            <img 
              src={file.url} 
              alt={decryptedName} 
              className="w-full h-full object-cover"
            />
          ) : (
            <FileIcon className="h-8 w-8 text-slate-500" />
          )}
        </div>
        
        <p className="text-xs text-gray-400 truncate leading-relaxed mt-auto px-1 flex-shrink-0">{decryptedName}</p>
      </div>
      
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-4 transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <a 
          href={file.url} 
          download={decryptedName} 
          className="p-3 rounded-full bg-black/60 backdrop-blur-sm text-slate-200 hover:text-cyan-300 transition-colors"
          title="Download"
        >
          <Download size={20} />
        </a>
      </div>
    </div>
  );
}