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
    <div className="min-h-screen w-full flex items-center justify-center p-4" style={{ fontFamily: 'Verdana, sans-serif' }}>
      <div className="fixed inset-0 bg-black"></div>
      <div id="particle-container" className="fixed inset-0 pointer-events-none" />
      
      <div className="relative w-full max-w-md">
        <div 
          className="rounded-3xl border shadow-2xl overflow-hidden"
          style={{
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.25), rgba(255, 255, 255, 0.1))',
            borderColor: 'rgba(255, 255, 255, 0.3)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.2)'
          }}
        >
          <div className="p-8 sm:p-10 text-white">
            <div className="text-center mb-10">
              <div className="relative inline-block mb-5">
                <div className="absolute inset-0 bg-cyan-400/20 rounded-full blur-xl"></div>
                <ShieldCheck className="relative mx-auto h-16 w-16 text-cyan-300 drop-shadow-lg" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-3 drop-shadow-lg">Secure Room</h2>
              <p className="text-white/80 text-sm leading-relaxed">
                Enter the password to encrypt and access your shared clipboard.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl px-6 py-4 text-white placeholder-white/60 focus:ring-2 focus:ring-cyan-300/50 focus:border-cyan-300/50 focus:outline-none transition-all duration-300 text-base border"
                  style={{ 
                    fontFamily: 'Verdana, sans-serif',
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.08))',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    borderColor: 'rgba(255, 255, 255, 0.3)'
                  }}
                  placeholder="Enter Room Password"
                />
              </div>
              
              <button
                type="submit"
                className="relative w-full group overflow-hidden rounded-xl py-4 px-6 font-bold text-base transition-all duration-300 disabled:cursor-not-allowed"
                style={{
                  background: password ? 'linear-gradient(135deg, #06b6d4, #0891b2)' : 'linear-gradient(135deg, rgba(6, 182, 212, 0.3), rgba(8, 145, 178, 0.3))',
                  color: password ? '#0f172a' : '#64748b'
                }}
                disabled={!password}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <span>Unlock Clipboard</span>
              </button>
            </form>

            <div 
              className="mt-10 p-4 rounded-xl text-white/90 text-xs text-center leading-relaxed border"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.06))',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                borderColor: 'rgba(255, 255, 255, 0.2)'
              }}
            >
              <p className="font-bold text-yellow-300 mb-1">Remember</p>
              <p>This password is your key. If forgotten, your data is unrecoverable.</p>
            </div>
          </div>
        </div>
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-cyan-400/20 via-transparent to-purple-400/20 blur-xl -z-10"></div>
      </div>
    </div>
  );
}