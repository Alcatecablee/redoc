export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  text_secondary: string;
  border: string;
  code_bg: string;
  success: string;
  warning: string;
  error: string;
}

export interface ThemeTypography {
  font_family: string;
  heading_font: string;
  code_font: string;
  base_size: string;
  line_height: string;
  heading_weights: {
    h1: number;
    h2: number;
    h3: number;
  };
  heading_sizes: {
    h1: string;
    h2: string;
    h3: string;
  };
}

export interface ThemeSpacing {
  section: string;
  paragraph: string;
  list_item: string;
  density?: "compact" | "comfortable" | "spacious";
}

export interface ThemeStyling {
  border_radius: string;
  code_border_radius: string;
  shadow: string;
}

export interface ThemeLayout {
  orientation: "single" | "multi";
}

export interface Theme {
  id: string;
  name: string;
  colors: ThemeColors;
  typography: ThemeTypography;
  spacing: ThemeSpacing;
  styling: ThemeStyling;
  layout: ThemeLayout;
}

export const themePresets: Record<string, Theme> = {
  "apple-light": {
    id: "apple-light",
    name: "Apple Light",
    colors: {
      primary: "#007aff",
      secondary: "#5856d6",
      accent: "#0a84ff",
      background: "#ffffff",
      surface: "#f2f2f7",
      text: "#000000",
      text_secondary: "#6e6e73",
      border: "#d1d1d6",
      code_bg: "#f5f5f7",
      success: "#34c759",
      warning: "#ff9500",
      error: "#ff3b30"
    },
    typography: {
      font_family: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif",
      heading_font: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif",
      code_font: "'SF Mono', Monaco, Menlo, Consolas, monospace",
      base_size: "17px",
      line_height: "1.47059",
      heading_weights: {
        h1: 700,
        h2: 600,
        h3: 600
      },
      heading_sizes: {
        h1: "2.5rem",
        h2: "2rem",
        h3: "1.5rem"
      }
    },
    spacing: {
      section: "4rem",
      paragraph: "1.5rem",
      list_item: "0.5rem",
      density: "comfortable"
    },
    styling: {
      border_radius: "12px",
      code_border_radius: "8px",
      shadow: "0 2px 8px rgba(0,0,0,0.08)"
    },
    layout: {
      orientation: "multi"
    }
  },
  "github-dark": {
    id: "github-dark",
    name: "GitHub Dark",
    colors: {
      primary: "#58a6ff",
      secondary: "#8b949e",
      accent: "#1f6feb",
      background: "#0d1117",
      surface: "#161b22",
      text: "#c9d1d9",
      text_secondary: "#8b949e",
      border: "#30363d",
      code_bg: "#161b22",
      success: "#3fb950",
      warning: "#d29922",
      error: "#f85149"
    },
    typography: {
      font_family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif",
      heading_font: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif",
      code_font: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
      base_size: "16px",
      line_height: "1.5",
      heading_weights: {
        h1: 600,
        h2: 600,
        h3: 600
      },
      heading_sizes: {
        h1: "2.25rem",
        h2: "1.75rem",
        h3: "1.25rem"
      }
    },
    spacing: {
      section: "3rem",
      paragraph: "1.5rem",
      list_item: "0.5rem",
      density: "compact"
    },
    styling: {
      border_radius: "6px",
      code_border_radius: "6px",
      shadow: "0 8px 24px rgba(0,0,0,0.4)"
    },
    layout: {
      orientation: "multi"
    }
  },
  "stripe-modern": {
    id: "stripe-modern",
    name: "Stripe Modern",
    colors: {
      primary: "#635bff",
      secondary: "#0a2540",
      accent: "#00d4ff",
      background: "#ffffff",
      surface: "#f6f9fc",
      text: "#0a2540",
      text_secondary: "#425466",
      border: "#e3e8ee",
      code_bg: "#f6f9fc",
      success: "#00d924",
      warning: "#ff9e18",
      error: "#cd4246"
    },
    typography: {
      font_family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif",
      heading_font: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif",
      code_font: "'Source Code Pro', Monaco, monospace",
      base_size: "16px",
      line_height: "1.6",
      heading_weights: {
        h1: 700,
        h2: 600,
        h3: 600
      },
      heading_sizes: {
        h1: "2.5rem",
        h2: "2rem",
        h3: "1.5rem"
      }
    },
    spacing: {
      section: "3.5rem",
      paragraph: "1.5rem",
      list_item: "0.5rem",
      density: "comfortable"
    },
    styling: {
      border_radius: "8px",
      code_border_radius: "6px",
      shadow: "0 4px 6px rgba(0,0,0,0.07)"
    },
    layout: {
      orientation: "multi"
    }
  },
  "notion-default": {
    id: "notion-default",
    name: "Notion Default",
    colors: {
      primary: "#2383e2",
      secondary: "#9b9a97",
      accent: "#0b6e99",
      background: "#ffffff",
      surface: "#f7f6f3",
      text: "#37352f",
      text_secondary: "#787774",
      border: "#e9e9e7",
      code_bg: "#f7f6f3",
      success: "#0f7b6c",
      warning: "#ffa344",
      error: "#eb5757"
    },
    typography: {
      font_family: "ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, sans-serif",
      heading_font: "ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, sans-serif",
      code_font: "'SFMono-Regular', Menlo, Consolas, 'PT Mono', 'Liberation Mono', Courier, monospace",
      base_size: "16px",
      line_height: "1.5",
      heading_weights: {
        h1: 700,
        h2: 600,
        h3: 600
      },
      heading_sizes: {
        h1: "2.25rem",
        h2: "1.75rem",
        h3: "1.25rem"
      }
    },
    spacing: {
      section: "3rem",
      paragraph: "1.5rem",
      list_item: "0.5rem",
      density: "comfortable"
    },
    styling: {
      border_radius: "4px",
      code_border_radius: "3px",
      shadow: "0 1px 3px rgba(0,0,0,0.08)"
    },
    layout: {
      orientation: "multi"
    }
  },
  "modern-light": {
    id: "modern-light",
    name: "Modern Light",
    colors: {
      primary: "#2563eb",
      secondary: "#64748b",
      accent: "#0ea5e9",
      background: "#ffffff",
      surface: "#f8fafc",
      text: "#0f172a",
      text_secondary: "#475569",
      border: "#e2e8f0",
      code_bg: "#f1f5f9",
      success: "#10b981",
      warning: "#f59e0b",
      error: "#ef4444"
    },
    typography: {
      font_family: "Inter, -apple-system, system-ui, sans-serif",
      heading_font: "Inter, -apple-system, system-ui, sans-serif",
      code_font: "'Fira Code', Monaco, Consolas, monospace",
      base_size: "16px",
      line_height: "1.6",
      heading_weights: {
        h1: 700,
        h2: 600,
        h3: 600
      },
      heading_sizes: {
        h1: "2.5rem",
        h2: "2rem",
        h3: "1.5rem"
      }
    },
    spacing: {
      section: "3rem",
      paragraph: "1.5rem",
      list_item: "0.5rem",
      density: "comfortable"
    },
    styling: {
      border_radius: "8px",
      code_border_radius: "6px",
      shadow: "0 1px 3px rgba(0,0,0,0.1)"
    },
    layout: {
      orientation: "multi"
    }
  },
  // Minimal / Clean (Linear / Framer-inspired)
  "minimal-clean-light": {
    id: "minimal-clean-light",
    name: "Minimal Clean (Light)",
    colors: {
      primary: "#0ea5e9",
      secondary: "#64748b",
      accent: "#10b981",
      background: "#ffffff",
      surface: "#f8fafc",
      text: "#0f172a",
      text_secondary: "#475569",
      border: "#e2e8f0",
      code_bg: "#f1f5f9",
      success: "#10b981",
      warning: "#f59e0b",
      error: "#ef4444"
    },
    typography: {
      font_family: "Inter, -apple-system, system-ui, sans-serif",
      heading_font: "Inter, -apple-system, system-ui, sans-serif",
      code_font: "'Fira Code', Monaco, Consolas, monospace",
      base_size: "16px",
      line_height: "1.7",
      heading_weights: { h1: 700, h2: 600, h3: 600 },
      heading_sizes: { h1: "2.75rem", h2: "2rem", h3: "1.25rem" }
    },
    spacing: {
      section: "4rem",
      paragraph: "1.25rem",
      list_item: "0.5rem",
      density: "spacious"
    },
    styling: {
      border_radius: "10px",
      code_border_radius: "8px",
      shadow: "0 1px 2px rgba(0,0,0,0.04)"
    },
    layout: { orientation: "single" }
  },
  "minimal-clean-dark": {
    id: "minimal-clean-dark",
    name: "Minimal Clean (Dark)",
    colors: {
      primary: "#38bdf8",
      secondary: "#94a3b8",
      accent: "#22c55e",
      background: "#0b0f17",
      surface: "#111827",
      text: "#e5e7eb",
      text_secondary: "#9ca3af",
      border: "#1f2937",
      code_bg: "#0b1220",
      success: "#22c55e",
      warning: "#f59e0b",
      error: "#ef4444"
    },
    typography: {
      font_family: "Inter, -apple-system, system-ui, sans-serif",
      heading_font: "Inter, -apple-system, system-ui, sans-serif",
      code_font: "'Fira Code', Monaco, Consolas, monospace",
      base_size: "16px",
      line_height: "1.7",
      heading_weights: { h1: 700, h2: 600, h3: 600 },
      heading_sizes: { h1: "2.75rem", h2: "2rem", h3: "1.25rem" }
    },
    spacing: {
      section: "4rem",
      paragraph: "1.25rem",
      list_item: "0.5rem",
      density: "spacious"
    },
    styling: {
      border_radius: "10px",
      code_border_radius: "8px",
      shadow: "0 10px 30px rgba(0,0,0,0.35)"
    },
    layout: { orientation: "single" }
  },
  // Tech / Developer-focused
  "tech-dev-light": {
    id: "tech-dev-light",
    name: "Tech Developer (Light)",
    colors: {
      primary: "#2563eb",
      secondary: "#475569",
      accent: "#10b981",
      background: "#ffffff",
      surface: "#0b1220",
      text: "#0f172a",
      text_secondary: "#475569",
      border: "#e2e8f0",
      code_bg: "#0b1220",
      success: "#16a34a",
      warning: "#d97706",
      error: "#dc2626"
    },
    typography: {
      font_family: "Inter, -apple-system, system-ui, sans-serif",
      heading_font: "Inter, -apple-system, system-ui, sans-serif",
      code_font: "'Fira Code', Menlo, Consolas, monospace",
      base_size: "15px",
      line_height: "1.6",
      heading_weights: { h1: 700, h2: 700, h3: 600 },
      heading_sizes: { h1: "2.25rem", h2: "1.75rem", h3: "1.25rem" }
    },
    spacing: {
      section: "2.5rem",
      paragraph: "1rem",
      list_item: "0.4rem",
      density: "compact"
    },
    styling: {
      border_radius: "6px",
      code_border_radius: "6px",
      shadow: "0 1px 2px rgba(0,0,0,0.06)"
    },
    layout: { orientation: "multi" }
  },
  "tech-dev-dark": {
    id: "tech-dev-dark",
    name: "Tech Developer (Dark)",
    colors: {
      primary: "#58a6ff",
      secondary: "#8b949e",
      accent: "#3fb950",
      background: "#0d1117",
      surface: "#161b22",
      text: "#c9d1d9",
      text_secondary: "#8b949e",
      border: "#30363d",
      code_bg: "#0b1220",
      success: "#3fb950",
      warning: "#d29922",
      error: "#f85149"
    },
    typography: {
      font_family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif",
      heading_font: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif",
      code_font: "'Fira Code', Menlo, Consolas, monospace",
      base_size: "15px",
      line_height: "1.55",
      heading_weights: { h1: 700, h2: 700, h3: 600 },
      heading_sizes: { h1: "2.25rem", h2: "1.75rem", h3: "1.25rem" }
    },
    spacing: {
      section: "2.5rem",
      paragraph: "1rem",
      list_item: "0.4rem",
      density: "compact"
    },
    styling: {
      border_radius: "6px",
      code_border_radius: "6px",
      shadow: "0 8px 24px rgba(0,0,0,0.4)"
    },
    layout: { orientation: "multi" }
  },
  // Professional / Corporate
  "corporate-light": {
    id: "corporate-light",
    name: "Corporate (Light)",
    colors: {
      primary: "#1d4ed8",
      secondary: "#6b7280",
      accent: "#0ea5e9",
      background: "#ffffff",
      surface: "#f9fafb",
      text: "#111827",
      text_secondary: "#6b7280",
      border: "#e5e7eb",
      code_bg: "#f3f4f6",
      success: "#15803d",
      warning: "#b45309",
      error: "#b91c1c"
    },
    typography: {
      font_family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      heading_font: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      code_font: "'Source Code Pro', Monaco, monospace",
      base_size: "16px",
      line_height: "1.65",
      heading_weights: { h1: 700, h2: 600, h3: 600 },
      heading_sizes: { h1: "2.5rem", h2: "2rem", h3: "1.25rem" }
    },
    spacing: {
      section: "3.5rem",
      paragraph: "1.25rem",
      list_item: "0.5rem",
      density: "comfortable"
    },
    styling: {
      border_radius: "6px",
      code_border_radius: "6px",
      shadow: "0 2px 8px rgba(0,0,0,0.08)"
    },
    layout: { orientation: "multi" }
  },
  "corporate-dark": {
    id: "corporate-dark",
    name: "Corporate (Dark)",
    colors: {
      primary: "#60a5fa",
      secondary: "#9ca3af",
      accent: "#38bdf8",
      background: "#0f172a",
      surface: "#111827",
      text: "#e5e7eb",
      text_secondary: "#9ca3af",
      border: "#1f2937",
      code_bg: "#0b1220",
      success: "#22c55e",
      warning: "#f59e0b",
      error: "#ef4444"
    },
    typography: {
      font_family: "Inter, -apple-system, system-ui, sans-serif",
      heading_font: "Inter, -apple-system, system-ui, sans-serif",
      code_font: "'Source Code Pro', Monaco, monospace",
      base_size: "16px",
      line_height: "1.65",
      heading_weights: { h1: 700, h2: 600, h3: 600 },
      heading_sizes: { h1: "2.5rem", h2: "2rem", h3: "1.25rem" }
    },
    spacing: {
      section: "3.5rem",
      paragraph: "1.25rem",
      list_item: "0.5rem",
      density: "comfortable"
    },
    styling: {
      border_radius: "6px",
      code_border_radius: "6px",
      shadow: "0 12px 32px rgba(0,0,0,0.35)"
    },
    layout: { orientation: "multi" }
  },
  // Creative / Modern
  "creative-modern-light": {
    id: "creative-modern-light",
    name: "Creative Modern (Light)",
    colors: {
      primary: "#7c3aed",
      secondary: "#111827",
      accent: "#22d3ee",
      background: "#ffffff",
      surface: "#fdfcff",
      text: "#0f172a",
      text_secondary: "#4b5563",
      border: "#ece7fe",
      code_bg: "#f7f3ff",
      success: "#16a34a",
      warning: "#ea580c",
      error: "#dc2626"
    },
    typography: {
      font_family: "Poppins, Inter, -apple-system, system-ui, sans-serif",
      heading_font: "Poppins, Inter, -apple-system, system-ui, sans-serif",
      code_font: "'Fira Code', Monaco, Consolas, monospace",
      base_size: "16px",
      line_height: "1.7",
      heading_weights: { h1: 800, h2: 700, h3: 600 },
      heading_sizes: { h1: "3rem", h2: "2.25rem", h3: "1.5rem" }
    },
    spacing: {
      section: "4.5rem",
      paragraph: "1.5rem",
      list_item: "0.6rem",
      density: "spacious"
    },
    styling: {
      border_radius: "16px",
      code_border_radius: "12px",
      shadow: "0 10px 30px rgba(124,58,237,0.15)"
    },
    layout: { orientation: "multi" }
  },
  "creative-modern-dark": {
    id: "creative-modern-dark",
    name: "Creative Modern (Dark)",
    colors: {
      primary: "#a78bfa",
      secondary: "#e5e7eb",
      accent: "#22d3ee",
      background: "#0b0f17",
      surface: "#0f172a",
      text: "#f3f4f6",
      text_secondary: "#9ca3af",
      border: "#1f2937",
      code_bg: "#0b1220",
      success: "#22c55e",
      warning: "#f59e0b",
      error: "#ef4444"
    },
    typography: {
      font_family: "Poppins, Inter, -apple-system, system-ui, sans-serif",
      heading_font: "Poppins, Inter, -apple-system, system-ui, sans-serif",
      code_font: "'Fira Code', Monaco, Consolas, monospace",
      base_size: "16px",
      line_height: "1.7",
      heading_weights: { h1: 800, h2: 700, h3: 600 },
      heading_sizes: { h1: "3rem", h2: "2.25rem", h3: "1.5rem" }
    },
    spacing: {
      section: "4.5rem",
      paragraph: "1.5rem",
      list_item: "0.6rem",
      density: "spacious"
    },
    styling: {
      border_radius: "16px",
      code_border_radius: "12px",
      shadow: "0 25px 60px rgba(0,0,0,0.45)"
    },
    layout: { orientation: "multi" }
  }
};

export function getThemeById(id: string): Theme | undefined {
  return themePresets[id];
}

export function getAllThemes(): Theme[] {
  return Object.values(themePresets);
}

export function getDefaultTheme(): Theme {
  return themePresets["modern-light"];
}

/**
 * Generate CSS variables from theme
 */
export function generateCSSVariables(theme: Theme): string {
  const cssVars: string[] = [];

  // Colors
  Object.entries(theme.colors).forEach(([key, value]) => {
    cssVars.push(`  --color-${key.replace(/_/g, '-')}: ${value};`);
  });

  // Typography
  cssVars.push(`  --font-family: ${theme.typography.font_family};`);
  cssVars.push(`  --font-heading: ${theme.typography.heading_font};`);
  cssVars.push(`  --font-code: ${theme.typography.code_font};`);
  cssVars.push(`  --font-size-base: ${theme.typography.base_size};`);
  cssVars.push(`  --line-height: ${theme.typography.line_height};`);
  
  Object.entries(theme.typography.heading_sizes).forEach(([key, value]) => {
    cssVars.push(`  --font-size-${key}: ${value};`);
  });
  
  Object.entries(theme.typography.heading_weights).forEach(([key, value]) => {
    cssVars.push(`  --font-weight-${key}: ${value};`);
  });

  // Spacing
  Object.entries(theme.spacing).forEach(([key, value]) => {
    if (typeof value === 'string') {
      cssVars.push(`  --spacing-${key.replace(/_/g, '-')}: ${value};`);
    }
  });

  // Styling
  Object.entries(theme.styling).forEach(([key, value]) => {
    cssVars.push(`  --${key.replace(/_/g, '-')}: ${value};`);
  });

  return `:root {\n${cssVars.join('\n')}\n}`;
}

/**
 * Convert RGB to hex color
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

/**
 * Parse color string to RGB components
 */
export function parseColor(color: string): { r: number; g: number; b: number } | null {
  // Try hex format
  const hexMatch = color.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (hexMatch) {
    return {
      r: parseInt(hexMatch[1], 16),
      g: parseInt(hexMatch[2], 16),
      b: parseInt(hexMatch[3], 16),
    };
  }

  // Try rgb/rgba format
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1]),
      g: parseInt(rgbMatch[2]),
      b: parseInt(rgbMatch[3]),
    };
  }

  return null;
}

/**
 * Calculate relative luminance for WCAG contrast calculations
 */
export function getLuminance(color: string): number {
  const rgb = parseColor(color);
  if (!rgb) return 0;

  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(val => {
    const sRGB = val / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculate contrast ratio between two colors (WCAG standard)
 */
export function getContrastRatio(color1: string, color2: string): number {
  const l1 = getLuminance(color1);
  const l2 = getLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if color pair meets WCAG AA standard (4.5:1 for normal text)
 */
export function meetsWCAG_AA(textColor: string, backgroundColor: string): boolean {
  return getContrastRatio(textColor, backgroundColor) >= 4.5;
}

/**
 * Check if color pair meets WCAG AAA standard (7:1 for normal text)
 */
export function meetsWCAG_AAA(textColor: string, backgroundColor: string): boolean {
  return getContrastRatio(textColor, backgroundColor) >= 7;
}

/**
 * Evaluate theme accessibility and return grade
 */
export function evaluateThemeAccessibility(theme: Theme): 'AAA' | 'AA' | 'A' | 'F' {
  const { text, text_secondary, background, surface } = theme.colors;
  
  const textOnBg = getContrastRatio(text, background);
  const textOnSurface = getContrastRatio(text, surface);
  const secondaryOnBg = getContrastRatio(text_secondary, background);
  
  const minRatio = Math.min(textOnBg, textOnSurface, secondaryOnBg);
  
  if (minRatio >= 7) return 'AAA';
  if (minRatio >= 4.5) return 'AA';
  if (minRatio >= 3) return 'A';
  return 'F';
}

/**
 * Merge partial theme with defaults
 */
export function mergeThemeWithDefaults(partial: Partial<Theme>, baseTheme?: Theme): Theme {
  const base = baseTheme || getDefaultTheme();
  
  return {
    id: partial.id || base.id,
    name: partial.name || base.name,
    colors: { ...base.colors, ...partial.colors },
    typography: { ...base.typography, ...partial.typography },
    spacing: { ...base.spacing, ...partial.spacing },
    styling: { ...base.styling, ...partial.styling },
    layout: { ...base.layout, ...partial.layout },
  };
}
