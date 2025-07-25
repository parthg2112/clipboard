// components/FileCard.jsx
"use client";

import { useState, useEffect } from 'react';
import { decrypt, decryptFile } from '../lib/crypto';
import { Download, X, File as FileIcon, Image as ImageIcon, Loader, Eye, Copy } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Modal from './Modal';

export default function FileCard({ file, encryptionKey, roomId, isConnected, onImageClick }) {
  const [decryptedName, setDecryptedName] = useState('...');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  const isImage = file.type?.startsWith('image/');

  useEffect(() => {
    const processFile = async () => {
      if (!encryptionKey) return;

      // Decrypt the filename
      try {
        const name = await decrypt(file.name, encryptionKey);
        setDecryptedName(name || 'Decryption Failed');
      } catch (error) {
        console.error("Decryption failed for file name", error);
        setDecryptedName('Decryption Failed');
      }

      // ✅ ADDED: Logic to decrypt the image for previewing
      if (isImage) {
        try {
          const response = await fetch(file.url);
          if (!response.ok) return;
          const encryptedFileBuffer = await response.arrayBuffer();
          const decryptedBlob = await decryptFile(encryptedFileBuffer, encryptionKey);
          // Create a temporary local URL from the decrypted image data
          setPreviewUrl(URL.createObjectURL(decryptedBlob));
        } catch (error) {
          console.error("Failed to decrypt image for preview:", error);
        }
      }
    };

    processFile();

    // Cleanup function to revoke the object URL and prevent memory leaks
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [file.name, file.url, encryptionKey, isImage]); // Rerun if file or key changes

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

  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    const toastId = toast.loading(`Decrypting ${decryptedName}...`);

    try {
      // 1. Fetch the encrypted file from the server
      const response = await fetch(file.url);
      if (!response.ok) throw new Error('File not found on server.');
      const encryptedFileBuffer = await response.arrayBuffer();

      // 2. Decrypt the file content
      const decryptedBlob = await decryptFile(encryptedFileBuffer, encryptionKey);

      // 3. Create a temporary URL and trigger the download
      const url = window.URL.createObjectURL(decryptedBlob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = decryptedName; // Use the decrypted filename
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      toast.success('Download complete!', { id: toastId });
    } catch (error) {
      console.error("Download/Decryption error:", error);
      toast.error('Failed to download or decrypt file.', { id: toastId });
    } finally {
      setIsDownloading(false);
    }
  };

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

  const handleCopyImage = async () => {
    if (!previewUrl) {
      toast.error("Preview not ready yet.");
      return;
    }

    try {
      // Check if the Clipboard API is supported
      if (!navigator.clipboard || !navigator.clipboard.write) {
        toast.error('Clipboard API not supported in this browser.');
        return;
      }

      // Get the original decrypted blob first
      const response = await fetch(previewUrl);
      const originalBlob = await response.blob();
      const originalType = file.type || 'image/png';

      // Try to copy in original format first (preserves size)
      try {
        if (originalType === 'image/png') {
          await navigator.clipboard.write([
            new ClipboardItem({
              'image/png': originalBlob
            })
          ]);
          toast.success('Image copied to clipboard!');
          return;
        }

        if (originalType === 'image/jpeg' || originalType === 'image/jpg') {
          await navigator.clipboard.write([
            new ClipboardItem({
              'image/jpeg': originalBlob
            })
          ]);
          toast.success('Image copied to clipboard!');
          return;
        }
      } catch (directCopyError) {
        console.log('Direct copy failed, trying PNG conversion:', directCopyError);
      }

      // Only convert to PNG if direct copy failed
      const img = new Image();
      img.crossOrigin = 'anonymous';

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = previewUrl;
      });

      // Create canvas and draw image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);

      // Convert canvas to PNG blob (only as fallback)
      const pngBlob = await new Promise(resolve => {
        canvas.toBlob(resolve, 'image/png');
      });

      if (!pngBlob) {
        throw new Error('Failed to convert image to PNG');
      }

      // Copy PNG blob to clipboard
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': pngBlob
        })
      ]);

      toast.success('Image copied to clipboard!');
    } catch (error) {
      console.error('Copy error:', error);

      // Enhanced error handling
      if (error.name === 'NotAllowedError') {
        toast.error('Clipboard access denied. Please allow clipboard permissions.');
      } else if (error.name === 'DataError') {
        toast.error('Invalid image data for clipboard.');
      } else if (error.message.includes('not supported')) {
        toast.error('Image format not supported for clipboard. Try right-clicking and copying instead.');
      } else {
        toast.error('Could not copy image. Try right-clicking and copying instead.');
      }
    }
  };

  return (
    <>
      <div className="relative group w-44 flex-shrink-0">
        <div className={`bg-gray-900/50 border border-gray-600 rounded-xl p-3 hover:border-white transition-all duration-300 w-full h-40 flex flex-col ${!isConnected ? 'opacity-50' : ''}`}>
          <div className="h-6 mb-2 flex-shrink-0"></div>

          <div className="w-full flex-grow bg-gray-800 rounded-lg mb-2 overflow-hidden flex items-center justify-center">
            {isImage ? (
              previewUrl ? (
                <img src={previewUrl} alt={decryptedName} className="w-full h-full object-cover" />
              ) : (
                <Loader size={20} className="animate-spin text-gray-500" />
              )
            ) : (
              <FileIcon className="h-8 w-8 text-slate-500" />
            )}
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

        {/* Overlay for download/preview */}
        <div className="absolute inset-0 z-10 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl flex items-center justify-center gap-2">
          {isImage && (
            <>
              <button onClick={() => onImageClick(previewUrl, file.id)} className="p-3 rounded-full bg-black/60 backdrop-blur-sm text-slate-200 hover:text-cyan-300 transition-colors">
                <Eye size={20} />
              </button>
              <button onClick={handleCopyImage} className="p-3 rounded-full bg-black/60 backdrop-blur-sm text-slate-200 hover:text-cyan-300 transition-colors">
                <Copy size={20} />
              </button>
            </>
          )}
          <button onClick={handleDownload} disabled={isDownloading} className="p-3 rounded-full bg-black/60 backdrop-blur-sm text-slate-200 hover:text-cyan-300 transition-colors disabled:opacity-50">
            {isDownloading ? <Loader size={20} className="animate-spin" /> : <Download size={20} />}
          </button>
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