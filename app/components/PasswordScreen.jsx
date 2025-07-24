"use client";

import { useState } from 'react';
import { ShieldCheck, Clock, ChevronDown } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function PasswordScreen({ onSubmit, isLoading }) {
  const [password, setPassword] = useState('');
  // State for the selected expiration time, default to 1 day
  const [expiration, setExpiration] = useState(24 * 60 * 60 * 1000); // 1 day in milliseconds

  const handleSubmit = (e) => {
    e.preventDefault();

    // 1. Minimum 6 character validation
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }

    if (password && !isLoading) {
      // Pass both password and expiration to the parent
      onSubmit(password, expiration);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-white/20 bg-white/5 backdrop-blur-lg shadow-xl">
          <div className="p-6 sm:p-8 text-white">
            <div className="text-center mb-8">
              <ShieldCheck className="mx-auto h-12 w-12 text-zinc-500 mb-4" />
              <h2 className="text-2xl font-semibold text-zinc-200 mb-2">Live Clipboard</h2>
              <p className="text-zinc-500 text-sm">
                Enter a password to create or join a room.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Password Input */}
              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md px-4 py-3 text-sm bg-zinc-900/50 text-white placeholder-zinc-600 focus:ring-1 focus:ring-white/20 focus:outline-none transition-all duration-300 border border-zinc-700 focus:border-zinc-500"
                  placeholder="Enter Password (min. 6 characters)"
                />
              </div>

              {/* 2. Expiration Dropdown */}
              <div>
                <label htmlFor="expiration" className="flex items-center gap-2 text-xs text-zinc-400 mb-2">
                  <Clock size={14} />
                  <span>Room Lifetime</span>
                </label>
                <div className="relative">
                  <select
                    id="expiration"
                    value={expiration}
                    onChange={(e) => setExpiration(Number(e.target.value))}
                    className="w-full rounded-md pl-4 pr-10 py-3 text-sm bg-black/20 text-white focus:ring-1 focus:ring-white/20 focus:outline-none transition-all duration-300 border border-white/20 focus:border-white/40 appearance-none"
                  >
                    <option className="bg-zinc-900" value={3 * 60 * 60 * 1000}>3 Hours</option>
                    <option className="bg-zinc-900" value={24 * 60 * 60 * 1000}>1 Day</option>
                    <option className="bg-zinc-900" value={7 * 24 * 60 * 60 * 1000}>7 Days</option>
                    <option className="bg-zinc-900" value={30 * 24 * 60 * 60 * 1000}>30 Days</option>
                  </select>
                  <ChevronDown
                    className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 pointer-events-none"
                  />
                </div>
              </div>
              
              <button
                type="submit"
                className="w-full group rounded-md py-3 px-4 bg-white text-black font-semibold text-sm transition-all duration-300 hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
                disabled={password.length < 6 || isLoading}
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
