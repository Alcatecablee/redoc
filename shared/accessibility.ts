export interface ContrastCheckResult {
  ratio: number;
  passesAA: boolean;
  passesAAA: boolean;
  level: 'AAA' | 'AA' | 'Fail';
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

export function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  if (!rgb1 || !rgb2) {
    return 1;
  }
  
  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
  
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  
  return (brightest + 0.05) / (darkest + 0.05);
}

export function checkContrast(foreground: string, background: string): ContrastCheckResult {
  const ratio = getContrastRatio(foreground, background);
  
  return {
    ratio: Math.round(ratio * 100) / 100,
    passesAA: ratio >= 4.5,
    passesAAA: ratio >= 7,
    level: ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : 'Fail'
  };
}

export function validateThemeAccessibility(theme: {
  colors: {
    text: string;
    background: string;
    primary: string;
    secondary?: string;
  }
}) {
  const results = {
    textOnBackground: checkContrast(theme.colors.text, theme.colors.background),
    primaryOnBackground: checkContrast(theme.colors.primary, theme.colors.background),
    secondaryOnBackground: theme.colors.secondary 
      ? checkContrast(theme.colors.secondary, theme.colors.background)
      : null,
    overallPass: false
  };
  
  results.overallPass = results.textOnBackground.passesAA && 
                        results.primaryOnBackground.passesAA;
  
  return results;
}
