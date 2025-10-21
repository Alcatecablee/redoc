import React, { useEffect, useRef, useState } from 'react';

interface TypewriterTextProps {
  texts: string[]; // Sequence of texts to type sequentially
  typingSpeed?: number; // base ms per character
  pauseBeforeNext?: number; // pause after each completed sentence
  className?: string;
  cursorClassName?: string;
  loop?: boolean;
  separator?: string; // what to insert between sentences, default is ' '
}

export const TypewriterText = ({
  texts,
  typingSpeed = 45,
  pauseBeforeNext = 1200,
  className = '',
  cursorClassName = 'ml-1 text-white/90',
  loop = false,
  separator = ' '
}: TypewriterTextProps) => {
  const [displayed, setDisplayed] = useState('');
  const [finished, setFinished] = useState(false);
  const [showCursor, setShowCursor] = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (!texts || texts.length === 0) return;

    let currentTextIndex = 0;
    let charIndex = 0;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const typeNextChar = () => {
      const text = texts[currentTextIndex] || '';

      if (charIndex < text.length) {
        const nextChar = text.charAt(charIndex);
        setDisplayed(prev => prev + nextChar);
        charIndex++;
        // Natural variance
        const variance = Math.round((Math.random() - 0.5) * typingSpeed * 0.6);
        const delay = Math.max(15, typingSpeed + variance);
        timeout = setTimeout(typeNextChar, delay);
        return;
      }

      // Finished current text
      if (currentTextIndex < texts.length - 1) {
        // Pause, then insert separator and move to next text
        timeout = setTimeout(() => {
          if (!mounted.current) return;
          setDisplayed(prev => prev + separator);
          currentTextIndex++;
          charIndex = 0;
          typeNextChar();
        }, pauseBeforeNext);
      } else {
        // Completed all texts
        setFinished(true);
        if (loop) {
          timeout = setTimeout(() => {
            if (!mounted.current) return;
            setDisplayed('');
            setFinished(false);
            currentTextIndex = 0;
            charIndex = 0;
            typeNextChar();
          }, pauseBeforeNext * 1.25);
        }
      }
    };

    // Start typing
    setDisplayed('');
    setFinished(false);
    typeNextChar();

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [texts, typingSpeed, pauseBeforeNext, loop, separator]);

  // Cursor blinking
  useEffect(() => {
    const iv = setInterval(() => {
      setShowCursor((s) => !s);
    }, 500);
    return () => clearInterval(iv);
  }, []);

  return (
    <span className={`inline-flex items-center ${className}`} aria-live="polite">
      <span>{displayed}</span>
      <span
        aria-hidden="true"
        className={cursorClassName}
        style={{ opacity: showCursor ? 1 : 0, transition: 'opacity 120ms linear' }}
      >
        |
      </span>
    </span>
  );
};

export default TypewriterText;
