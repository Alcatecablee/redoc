import React, { useEffect, useRef, useState } from 'react';

interface TypewriterTextProps {
  texts: string[]; // Sequence of texts to type sequentially
  typingSpeed?: number; // base ms per character
  pauseBeforeNext?: number; // pause after each completed sentence
  className?: string;
  loop?: boolean;
  separator?: string; // what to insert between sentences, default is '\n'
  lineClassName?: string; // class applied to additional lines after the first
  preserveSpace?: boolean; // reserve full height to prevent layout shift
}

export const TypewriterText = ({
  texts,
  typingSpeed = 45,
  pauseBeforeNext = 1200,
  className = '',
  loop = false,
  separator = '\n',
  lineClassName = 'block mt-2 text-white/80',
  preserveSpace = true,
}: TypewriterTextProps) => {
  const [displayed, setDisplayed] = useState('');
  const [finished, setFinished] = useState(false);
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
        // Natural variance for more human feel
        const variance = Math.round((Math.random() - 0.5) * typingSpeed * 0.6);
        const delay = Math.max(12, typingSpeed + variance);
        timeout = setTimeout(typeNextChar, delay);
        return;
      }

      // Finished current text
      if (currentTextIndex < texts.length - 1) {
        timeout = setTimeout(() => {
          if (!mounted.current) return;
          setDisplayed(prev => prev + separator);
          currentTextIndex++;
          charIndex = 0;
          typeNextChar();
        }, pauseBeforeNext);
      } else {
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

  const visibleParts = displayed.split('\n');
  const fullText = texts.join(separator);

  return (
    <span className={`relative inline-block ${className}`} aria-live="polite">
      {preserveSpace && (
        // Invisible full text placeholder reserves height/width preventing layout shift
        <span className="invisible whitespace-pre-wrap block" aria-hidden>
          {fullText}
        </span>
      )}

      {/* Visible typing layer placed absolute to overlay reserved space */}
      <span className="absolute inset-0 left-0 top-0 whitespace-pre-wrap block">
        {visibleParts.map((part, idx) => (
          <span key={idx} className={idx === 0 ? 'text-center font-bold' : lineClassName}>
            {part}
          </span>
        ))}
      </span>
    </span>
  );
};

export default TypewriterText;
