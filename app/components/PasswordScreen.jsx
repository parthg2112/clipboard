"use client";

import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';

export default function PasswordScreen({ onSubmit }) {
  const [password, setPassword] = useState('');

  /** @param {React.FormEvent} e */
  const handleSubmit = (e) => {
    e.preventDefault();
    if (password) {
      onSubmit(password);
    }
  };

  return (
    // The parent div in layout.jsx now handles centering
    <div 
      className="w-full max-w-md rounded-2xl bg-slate-900/80 border border-slate-700 shadow-2xl"
      style={{
        boxShadow: '0 0 15px rgba(0, 255, 255, 0.1), 0 0 30px rgba(0, 255, 255, 0.08), inset 0 0 10px rgba(0, 255, 255, 0.05)'
      }}
    >
      <div className="p-8 text-white">
        <div className="text-center mb-6">
            <ShieldCheck className="mx-auto h-12 w-12 text-cyan-400" />
            <h2 className="mt-4 text-2xl font-bold text-white">Secure Room</h2>
            <p className="text-slate-300 text-sm mt-2">Enter the password to encrypt and access your shared clipboard.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-slate-800/70 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-400 focus:outline-none transition-all"
            placeholder="Enter Room Password"
          />
          <button
            type="submit"
            className="w-full bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-bold py-3 px-4 rounded-lg transition-all disabled:bg-cyan-800/50 disabled:text-slate-400 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/20"
            disabled={!password}
          >
            Unlock Clipboard
          </button>
        </form>
         <div className="mt-6 p-3 bg-slate-800/40 border border-slate-700 rounded-lg text-slate-300 text-xs text-center">
            <strong className="font-bold">Remember:</strong> This password is your key. If forgotten, your data is unrecoverable.
        </div>
      </div>
    </div>
  );
}
