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
      setIsLoading(true);
      onSubmit(password);
      // In a real app, you'd likely remove the loading state in the parent
      // component after the submission logic is complete.
      setTimeout(() => setIsLoading(false), 2000); 
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Main container with a minimal, dark theme */}
        <div 
          className="rounded-2xl border border-zinc-800 bg-[#111]"
        >
          <div className="p-6 sm:p-8 text-white">
            <div className="text-center mb-8">
              {/* Minimalist Icon */}
              <ShieldCheck className="mx-auto h-12 w-12 text-zinc-500 mb-4" />
              
              <h2 className="text-2xl font-semibold text-zinc-200 mb-2">Secure Room</h2>
              <p className="text-zinc-500 text-sm">
                Enter the password to access the clipboard.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Concise and minimal input field */}
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md px-4 py-3 text-sm bg-zinc-900/50 text-white placeholder-zinc-600 focus:ring-1 focus:ring-white/20 focus:outline-none transition-all duration-300 border border-zinc-700 focus:border-zinc-500"
                  placeholder="Enter Password"
                />
              </div>
              
              {/* Minimalist submit button */}
              <button
                type="submit"
                className="w-full group rounded-md py-3 px-4 bg-white text-black font-semibold text-sm transition-all duration-300 hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
                disabled={!password || isLoading}
              >
                <span>{isLoading ? 'Unlocking...' : 'Unlock'}</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}