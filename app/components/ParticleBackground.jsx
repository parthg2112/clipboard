"use client";

import { useEffect } from 'react';

const ParticleBackground = () => {
  useEffect(() => {
    const container = document.getElementById('particle-container');
    if (!container) return;

    container.innerHTML = '';

    // UPDATED: Increased particle count by 50% (75 -> 112)
    const particleCount = 112; 

    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.classList.add('particle');

      const size = Math.random() * 4 + 1;
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;

      particle.style.top = `${Math.random() * 100}%`;
      particle.style.left = `${Math.random() * 100}%`;
      
      particle.style.animationDelay = `${Math.random() * 4}s`;

      container.appendChild(particle);
    }
  }, []);

  return <div id="particle-container"></div>;
};

export default ParticleBackground;
