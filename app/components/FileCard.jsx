"use client";

import { useState, useEffect } from 'react';
import { decrypt } from '../lib/crypto';
import { Download, Trash2, File } from 'lucide-react';

export default function FileCard({ file, encryptionKey, onDelete }) {
  const [decryptedName, setDecryptedName] = useState('Decrypting...');

  useEffect(() => {
    const decryptName = async () => {
      const name = await decrypt(file.name, encryptionKey);
      setDecryptedName(name || 'Decryption Failed');
    };
    decryptName();
  }, [file.name, encryptionKey]);

  const isImage = file.type.startsWith('image/');

  return (
    <div className="bg-gray-700 p-3 rounded-lg flex flex-col justify-between transition-all hover:bg-gray-600">
      <div>
        {isImage ? (
          <img src={file.url} alt={decryptedName} className="w-full h-24 object-cover rounded-md mb-2" />
        ) : (
          <div className="w-full h-24 bg-gray-800 rounded-md mb-2 flex items-center justify-center">
            <File className="h-10 w-10 text-gray-500" />
          </div>
        )}
        <p className="text-sm font-medium text-white truncate" title={decryptedName}>{decryptedName}</p>
        <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
      </div>
      <div className="mt-3 flex gap-2">
        <a href={file.url} target="_blank" download={decryptedName} className="flex-1 flex items-center justify-center gap-1 text-center bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-1 px-2 rounded transition-all">
          <Download size={12} /> Download
        </a>
        <button onClick={() => onDelete(file)} className="flex-1 flex items-center justify-center gap-1 text-center bg-red-600 hover:bg-red-700 text-white text-xs font-semibold py-1 px-2 rounded transition-all">
          <Trash2 size={12} /> Delete
        </button>
      </div>
    </div>
  );
}
