"use client";

import { useEffect } from 'react';

const ParticleBackground = () => {
  useEffect(() => {
    const container = document.getElementById('particle-container');
    if (!container) return;

    // Clear any existing particles to prevent duplication on hot reloads
    container.innerHTML = '';

    const particleCount = 75; // Adjust number of particles

    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.classList.add('particle');

      const size = Math.random() * 4 + 1; // Particle size between 1px and 5px
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;

      particle.style.top = `${Math.random() * 100}%`;
      particle.style.left = `${Math.random() * 100}%`;
      
      // Randomize animation delay for a more natural effect
      particle.style.animationDelay = `${Math.random() * 4}s`;

      container.appendChild(particle);
    }
  }, []);

  return <div id="particle-container"></div>;
};

export default ParticleBackground;