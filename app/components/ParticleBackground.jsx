"use client";

import { useEffect } from 'react';

const MatrixParticleBackground = () => {
  useEffect(() => {
    const container = document.getElementById('particle-container');
    if (!container) return;

    container.innerHTML = '';

    // Characters to randomly select from (alphanumeric + some special chars)
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    // Calculate grid dimensions based on viewport
    const charWidth = 20; // Width of each character column
    const charHeight = 25; // Height of each character row
    const columns = Math.floor(window.innerWidth / charWidth);
    const rows = Math.floor(window.innerHeight / charHeight);
    
    // Create columns for the rain effect
    for (let col = 0; col < columns; col++) {
      const columnDiv = document.createElement('div');
      columnDiv.classList.add('matrix-column');
      columnDiv.style.left = `${col * charWidth}px`;
      
      // Random number of characters per column (10-25)
      const numChars = Math.floor(Math.random() * 15) + 10;
      
      for (let row = 0; row < numChars; row++) {
        const char = document.createElement('div');
        char.classList.add('matrix-char');
        char.textContent = characters[Math.floor(Math.random() * characters.length)];
        
        // Position character
        char.style.top = `${row * charHeight}px`;
        
        // Random animation delay for staggered effect
        char.style.animationDelay = `${Math.random() * 5}s`;
        
        // Random animation duration for varied speeds
        const duration = Math.random() * 3 + 2; // 2-5 seconds
        char.style.animationDuration = `${duration}s`;
        
        // Add brightness variation
        const brightness = Math.random() * 0.7 + 0.3; // 0.3-1.0
        char.style.opacity = brightness;
        
        columnDiv.appendChild(char);
      }
      
      container.appendChild(columnDiv);
    }

    // Character change interval
    const changeInterval = setInterval(() => {
      const chars = document.querySelectorAll('.matrix-char');
      chars.forEach(char => {
        if (Math.random() < 0.1) { // 10% chance to change each character
          char.textContent = characters[Math.floor(Math.random() * characters.length)];
        }
      });
    }, 100);

    // Cleanup function
    return () => {
      clearInterval(changeInterval);
    };
  }, []);

  return <div id="particle-container"></div>;
};

export default MatrixParticleBackground;