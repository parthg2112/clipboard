"use client";

import { useState, useEffect } from 'react';
import { decrypt } from '../lib/crypto';
import { Download, X, File as FileIcon, WifiOff } from 'lucide-react';

export default function FileCard({ file, encryptionKey, roomId, isConnected }) {
  const [decryptedName, setDecryptedName] = useState('...');
  const [isHovered, setIsHovered] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const decryptName = async () => {
      try {
        const name = await decrypt(file.name, encryptionKey);
        setDecryptedName(name || 'Decryption Failed');
      } catch (error) {
        console.error('File name decryption failed:', error);
        setDecryptedName('Decryption Failed');
      }
    };
    decryptName();
  }, [file.name, encryptionKey]);
  
  const handleDelete = async () => {
    if (!isConnected) {
      alert("Cannot delete: not connected to the server.");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this file?")) return;
    
    try {
      setIsDeleting(true);
      console.log(`Deleting file ${file.id} via API`);
      
      const response = await fetch(`/api/files?roomId=${roomId}&fileId=${file.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Delete failed');
      }

      const result = await response.json();
      console.log('File deletion response:', result);
      
      // File will be removed from UI via WebSocket 'file-deleted' event
      
    } catch (error) {
      console.error("Error deleting file:", error);
      alert(`Could not delete file: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownload = (e) => {
    // Prevent download if offline
    if (!isConnected) {
      e.preventDefault();
      alert("Cannot download: not connected to the server.");
      return;
    }
  };

  const isImage = file.type?.startsWith('image/');

  return (
    <div 
      className="relative group w-44"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`bg-gray-900/50 border border-gray-600 rounded-xl p-3 hover:border-white transition-all duration-300 w-full h-40 flex flex-col ${
        !isConnected ? 'opacity-50' : ''
      }`}>
        <div className="flex justify-between items-start mb-2 flex-shrink-0">
          <div className="flex items-center gap-1">
            {!isConnected && (
              <WifiOff size={12} className="text-red-400" title="Offline" />
            )}
            {isDeleting && (
              <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
            )}
          </div>
          <button 
            onClick={handleDelete} 
            disabled={!isConnected || isDeleting}
            className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all duration-200 p-1 disabled:opacity-30 disabled:cursor-not-allowed"
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
              onError={(e) => {
                console.error('Image failed to load:', file.url);
                e.target.style.display = 'none';
                e.target.parentNode.innerHTML = '<div class="flex items-center justify-center h-full"><span class="text-red-400 text-xs">Failed to load</span></div>';
              }}
            />
          ) : (
            <FileIcon className="h-8 w-8 text-slate-500" />
          )}
        </div>
        
        <p className="text-xs text-gray-400 truncate leading-relaxed mt-auto px-1 flex-shrink-0">
          {decryptedName}
        </p>

        {/* File info */}
        <div className="text-xs text-gray-600 mt-1 px-1">
          {file.size ? formatFileSize(file.size) : 'Unknown size'}
        </div>
      </div>
      
      {/* Download button overlay */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-4 transition-opacity duration-300 ${
        isHovered && !isDeleting ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}>
        <a 
          href={file.url} 
          download={decryptedName}
          onClick={handleDownload}
          className={`p-3 rounded-full bg-black/60 backdrop-blur-sm text-slate-200 hover:text-cyan-300 transition-colors ${
            !isConnected ? 'cursor-not-allowed opacity-50' : ''
          }`}
          title={isConnected ? "Download" : "Offline - cannot download"}
        >
          <Download size={20} />
        </a>
      </div>

      {/* Deletion loading indicator */}
      {isDeleting && (
        <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
          <div className="text-white text-sm">Deleting...</div>
        </div>
      )}
    </div>
  );
}

// Utility function to format file size
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}