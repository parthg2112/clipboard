"use client";

import { useState } from 'react';
// You may need to install lucide-react: npm install lucide-react
import { ShieldCheck } from 'lucide-react';

export default function PasswordScreen({ onSubmit }) {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password && !isLoading) {
      // Example of showing a loading state
      setIsLoading(true);
      // Pass the password to the parent component's function
      onSubmit(password);
      // You might want to handle the end of loading state in the parent component
      setTimeout(() => setIsLoading(false), 2000); 
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-black">
      <div className="relative w-full max-w-md">
        {/* Main container with glassmorphism styles */}
        <div 
          className="rounded-3xl border shadow-2xl overflow-hidden"
          style={{
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
            borderColor: 'rgba(255, 255, 255, 0.2)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
          }}
        >
          <div className="p-8 sm:p-10 text-white">
            <div className="text-center mb-10">
              {/* Icon with a decorative glow effect */}
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
                {/* Styled input field */}
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl px-6 py-4 text-white placeholder-white/60 focus:ring-2 focus:ring-cyan-300/50 focus:outline-none transition-all duration-300 text-base border"
                  style={{ 
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.08))',
                    borderColor: 'rgba(255, 255, 255, 0.3)'
                  }}
                  placeholder="Enter Room Password"
                />
              </div>
              
              {/* Styled button with gradient and hover effect */}
              <button
                type="submit"
                className="relative w-full group overflow-hidden rounded-xl py-4 px-6 font-bold text-base transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                  color: 'white' 
                }}
                disabled={!password || isLoading}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <span>{isLoading ? 'Unlocking...' : 'Unlock Clipboard'}</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}