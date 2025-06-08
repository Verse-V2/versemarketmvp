"use client";

import { useEffect } from 'react';

export function ImagePreloader() {
  useEffect(() => {
    // Preload critical images for currency toggle
    const preloadImages = [
      '/cash-icon.png',
      '/verse-coin.png'
    ];

    preloadImages.forEach((src) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = src;
      document.head.appendChild(link);
    });

    // Cleanup function to remove preload links when component unmounts
    return () => {
      preloadImages.forEach((src) => {
        const existingLink = document.querySelector(`link[href="${src}"]`);
        if (existingLink) {
          document.head.removeChild(existingLink);
        }
      });
    };
  }, []);

  return null; // This component doesn't render anything visible
} 