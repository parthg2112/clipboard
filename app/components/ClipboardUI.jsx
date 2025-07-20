"use client";

import { useState, useEffect, useRef } from 'react';
import { encrypt, decrypt } from '../lib/crypto';
import FileCard from './FileCard';
import { LogOut, UploadCloud, Clipboard, FileText } from 'lucide-react';

export default function ClipboardUI({ roomId, encryptionKey, clipboard, setClipboard, socket, onLogout, isDataLoading }) {
  const [decryptedText, setDecryptedText] = useState('');
  const [status, setStatus] = useState('');
  const [uploadProgress, setUploadProgress] = useState(null);
  
  const textUpdateTimeout = useRef(null);

  // Decrypt text when it arrives from the server
  useEffect(() => {
    const decryptText = async () => {
      if (clipboard.text) {
        const text = await decrypt(clipboard.text, encryptionKey);
        if (text !== null) {
          setDecryptedText(text);
        }
      } else {
        setDecryptedText('');
      }
    };
    decryptText();
  }, [clipboard.text, encryptionKey]);

  const handleTextChange = (newText) => {
    setDecryptedText(newText);
    setStatus('Syncing...');
    if (textUpdateTimeout.current) {
      clearTimeout(textUpdateTimeout.current);
    }
    textUpdateTimeout.current = setTimeout(async () => {
      const encryptedText = await encrypt(newText, encryptionKey);
      socket.emit('text-update', { roomId, encryptedText });
      setStatus('Saved.');
      setTimeout(() => setStatus(''), 2000);
    }, 500);
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    setUploadProgress(0);

    const encryptedName = await encrypt(file.name, encryptionKey);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('roomId', roomId);
    formData.append('encryptedName', encryptedName);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/files', true);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = (event.loaded / event.total) * 100;
        setUploadProgress(percentComplete);
      }
    };

    xhr.onload = () => {
      setUploadProgress(null);
      if (xhr.status !== 200) {
        alert('File upload failed.');
        console.error('Upload error:', xhr.responseText);
      }
    };
    
    xhr.onerror = () => {
        setUploadProgress(null);
        alert('An error occurred during the upload.');
    };

    xhr.send(formData);
  };

  const handleDeleteFile = async (fileToDelete) => {
    if (!window.confirm("Are you sure you want to delete this file?")) return;
    
    try {
      await fetch(`/api/files/${fileToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: roomId,
          fileId: fileToDelete.id,
          fileUrl: fileToDelete.url,
        }),
      });
    } catch (error) {
      console.error("Error deleting file:", error);
      alert("Could not delete file.");
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 md:p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2"><Clipboard /> Live Clipboard</h1>
        <button onClick={onLogout} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-all">
          <LogOut size={16} /> Lock & Exit
        </button>
      </div>

      <div className="mb-6 p-3 bg-gray-800 border border-gray-700 rounded-lg">
        <p className="text-sm text-gray-400">Your secure Room ID:</p>
        <p className="text-sm font-mono text-blue-400 break-all">{roomId}</p>
      </div>

      {isDataLoading ? <p>Connecting to clipboard...</p> : (
        <div className="space-y-6">
            <div className="bg-gray-800 border border-gray-700 p-4 rounded-2xl shadow-lg">
                <h3 className="text-xl font-semibold mb-3 text-gray-200 flex items-center gap-2"><FileText /> Text</h3>
                <textarea
                  value={decryptedText}
                  onChange={(e) => handleTextChange(e.target.value)}
                  className="w-full h-48 bg-gray-900 border border-gray-600 rounded-lg p-4 text-gray-200 resize-y focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Type or paste text here..."
                />
                <div className="text-sm text-gray-500 mt-2 h-4">{status}</div>
            </div>

            <div className="bg-gray-800 border border-gray-700 p-4 rounded-2xl shadow-lg">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold text-gray-200 flex items-center gap-2"><UploadCloud /> Files & Images</h3>
                    <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-all">
                        <span>Upload File</span>
                        <input type="file" onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])} className="hidden" />
                    </label>
                </div>
                {uploadProgress !== null && (
                    <div className="w-full bg-gray-700 rounded-full h-2.5 mb-4">
                        <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
                    </div>
                )}
                {clipboard.files.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {clipboard.files.map(file => (
                            <FileCard key={file.id} file={file} encryptionKey={encryptionKey} onDelete={handleDeleteFile} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500">No files uploaded yet.</div>
                )}
            </div>
        </div>
      )}
    </div>
  );
}
