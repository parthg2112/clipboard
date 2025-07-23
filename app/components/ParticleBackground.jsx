// app/components/ParticleBackground.jsx
"use client";

import { useEffect, useRef } from 'react';

export default function ParticleBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let animationFrameId;

    // Set canvas dimensions and handle resizing
    const setupCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    window.addEventListener('resize', setupCanvas);
    setupCanvas();

    // --- Animation Logic ---
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const fontSize = 16;
    const columns = Math.floor(canvas.width / fontSize);
    
    const drops = [];
    for (let i = 0; i < columns; i++) {
      drops[i] = 1;
    }

    const draw = () => {
      // CHANGE 1: Increase alpha from 0.05 to 0.1. This makes the trails
      // fade faster, resulting in a "slower" and less cluttered visual effect.
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // CHANGE 2: Set the color to a white shade with 70% opacity.
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = `${fontSize}px monospace`;

      // 3. Loop through each column to draw the characters
      for (let i = 0; i < columns; i++) {
        const text = characters.charAt(Math.floor(Math.random() * characters.length));
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }

        drops[i]++;
      }
    };

    // --- Start the animation loop ---
    const animate = () => {
      draw();
      animationFrameId = window.requestAnimationFrame(animate);
    };
    
    animate();

    // --- Cleanup function ---
    return () => {
      window.removeEventListener('resize', setupCanvas);
      window.cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} id="particle-container" />;
}