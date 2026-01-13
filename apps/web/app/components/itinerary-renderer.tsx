'use client';

import { useEffect, useRef } from 'react';
import styles from './itinerary-renderer.module.css';

type ItineraryRendererProps = {
  htmlContent: string;
};

export function ItineraryRenderer({ htmlContent }: ItineraryRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && htmlContent) {
      // Create a temporary div to parse the HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;
      
      // Clear the container and append the parsed content
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(tempDiv.firstElementChild || tempDiv);
    }
  }, [htmlContent]);

  return (
    <div className={styles.itineraryContainer}>
      <div ref={containerRef} className={styles.itineraryContent} />
    </div>
  );
}
