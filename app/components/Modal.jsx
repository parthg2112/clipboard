// components/Modal.jsx
"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, onConfirm, title, children }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        // Backdrop
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative w-full max-w-md bg-[#111] border border-zinc-800 rounded-xl shadow-xl"
          >
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-zinc-800">
              <h3 className="text-lg font-semibold text-zinc-200">{title}</h3>
              <button
                onClick={onClose}
                className="text-zinc-500 hover:text-white transition-colors duration-200"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-6 text-zinc-400 text-sm leading-relaxed">
              {children}
            </div>
            
            {/* Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 bg-black/50 border-t border-zinc-800">
              <button
                onClick={onClose}
                className="px-4 py-2 font-semibold text-sm text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-md transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="px-4 py-2 font-semibold text-sm text-black bg-white hover:bg-zinc-200 rounded-md transition-colors duration-200"
              >
                Confirm
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}