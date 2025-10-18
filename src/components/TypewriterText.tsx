import { useState, useEffect } from 'react';

interface TypewriterTextProps {
  texts: string[];
  delay?: number;
  pauseDelay?: number;
  className?: string;
}

export const TypewriterText = ({ 
  texts, 
  delay = 50, 
  pauseDelay = 2000,
  className = ''
}: TypewriterTextProps) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  const fullText = texts.join(' ');

  useEffect(() => {
    const handleTyping = () => {
      if (!isDeleting && currentIndex < fullText.length) {
        // Typing forward
        setDisplayedText(fullText.substring(0, currentIndex + 1));
        setCurrentIndex(prev => prev + 1);
      } else if (!isDeleting && currentIndex === fullText.length) {
        // Pause before deleting
        setTimeout(() => setIsDeleting(true), pauseDelay);
      } else if (isDeleting && currentIndex > 0) {
        // Deleting backward
        setDisplayedText(fullText.substring(0, currentIndex - 1));
        setCurrentIndex(prev => prev - 1);
      } else if (isDeleting && currentIndex === 0) {
        // Reset for next loop
        setIsDeleting(false);
        setCurrentTextIndex((prev) => (prev + 1) % texts.length);
      }
    };

    const timeout = setTimeout(handleTyping, isDeleting ? delay / 2 : delay);
    return () => clearTimeout(timeout);
  }, [currentIndex, isDeleting, fullText, delay, pauseDelay, texts.length]);

  return <span className={className}>{displayedText}</span>;
};
