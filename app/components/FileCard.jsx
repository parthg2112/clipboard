// components/FileCard.jsx
"use client";

import { useState, useEffect } from 'react';
import { decrypt } from '../lib/crypto';
import { Download, X, File as FileIcon, Image as ImageIcon, Loader, Eye } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Modal from './Modal';

export default function FileCard({ file, encryptionKey, roomId, isConnected, onImageClick }) {
  const [decryptedName, setDecryptedName] = useState('...');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const decryptName = async () => {
      if (file.name && encryptionKey) {
        try {
          const name = await decrypt(file.name, encryptionKey);
          setDecryptedName(name);
        } catch (error) {
          console.error("Decryption failed for file name", error);
          setDecryptedName('Decryption Failed');
        }
      }
    };
    decryptName();
  }, [file.name, encryptionKey]);

  const handleDeleteConfirm = async () => {
    if (!isConnected) {
      toast.error("Cannot delete: not connected.");
      return;
    }
    
    setIsDeleting(true);
    setIsModalOpen(false);
    const toastId = toast.loading('Deleting file...');

    try {
      const response = await fetch(`/api/files?roomId=${roomId}&fileId=${file.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Delete failed');
      }

      toast.success('File deleted', { id: toastId });
    } catch (error) {
      toast.error(`Delete failed: ${error.message}`, { id: toastId });
    } finally {
      setIsDeleting(false);
    }
  };

  const isImage = file.type?.startsWith('image/');

  return (
    <>
      <div className="relative group w-44 flex-shrink-0">
        <div className={`bg-gray-900/50 border border-gray-600 rounded-xl p-3 hover:border-white transition-all duration-300 w-full h-40 flex flex-col ${!isConnected ? 'opacity-50' : ''}`}>
          <div className="h-6 mb-2 flex-shrink-0"></div>
          
          <div className="w-full flex-grow bg-gray-800 rounded-lg mb-2 overflow-hidden flex items-center justify-center">
            {isImage ? <img src={file.url} alt={decryptedName} className="w-full h-full object-cover" /> : <FileIcon className="h-8 w-8 text-slate-500" />}
          </div>

          {/* FIX: Wrapped name and size in a div to prevent layout issues */}
          <div>
            <p className="text-xs text-gray-400 truncate">{decryptedName}</p>
            <div className="text-xs text-gray-600">{file.size ? formatFileSize(file.size) : ''}</div>
          </div>
        </div>

        <button onClick={() => setIsModalOpen(true)} disabled={!isConnected || isDeleting} className="absolute top-2 right-2 z-20 text-gray-500 hover:text-red-400 bg-gray-900/50 p-1 rounded-full transition-all duration-200 disabled:opacity-30">
          {isDeleting ? <Loader size={14} className="animate-spin" /> : <X size={14} />}
        </button>

        <div className="absolute inset-0 z-10 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl flex items-center justify-center gap-4">
          {isImage && (
            <button onClick={onImageClick} className="p-3 rounded-full bg-black/60 backdrop-blur-sm text-slate-200 hover:text-cyan-300 transition-colors">
              <Eye size={20} />
            </button>
          )}
          <a href={file.url} download={decryptedName} className="p-3 rounded-full bg-black/60 backdrop-blur-sm text-slate-200 hover:text-cyan-300 transition-colors">
            <Download size={20} />
          </a>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onConfirm={handleDeleteConfirm} title="Delete File">
        <p>Are you sure you want to permanently delete this file?</p>
        <p className="font-bold mt-2 truncate">{decryptedName}</p>
      </Modal>
    </>
  );
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}