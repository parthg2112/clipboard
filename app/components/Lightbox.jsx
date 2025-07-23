// components/Lightbox.jsx
"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function Lightbox({ imageUrl, onClose }) {
  if (!imageUrl) return null;

  return (
    <AnimatePresence>
      {imageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 backdrop-blur-lg"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="relative"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking on the image
          >
            <img
              src={imageUrl}
              alt="Lightbox"
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
            />
            <button
              onClick={onClose}
              className="absolute -top-4 -right-4 bg-gray-800 text-white p-2 rounded-full hover:bg-gray-700 transition-colors"
            >
              <X size={24} />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}