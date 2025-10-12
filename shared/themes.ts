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
}

export interface ThemeSpacing {
  section: string;
  paragraph: string;
  list_item: string;
}

export interface ThemeStyling {
  border_radius: string;
  code_border_radius: string;
  shadow: string;
}

export interface Theme {
  id: string;
  name: string;
  colors: ThemeColors;
  typography: ThemeTypography;
  spacing: ThemeSpacing;
  styling: ThemeStyling;
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
      }
    },
    spacing: {
      section: "4rem",
      paragraph: "1.5rem",
      list_item: "0.5rem"
    },
    styling: {
      border_radius: "12px",
      code_border_radius: "8px",
      shadow: "0 2px 8px rgba(0,0,0,0.08)"
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
      }
    },
    spacing: {
      section: "3rem",
      paragraph: "1.5rem",
      list_item: "0.5rem"
    },
    styling: {
      border_radius: "6px",
      code_border_radius: "6px",
      shadow: "0 8px 24px rgba(0,0,0,0.4)"
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
      }
    },
    spacing: {
      section: "3.5rem",
      paragraph: "1.5rem",
      list_item: "0.5rem"
    },
    styling: {
      border_radius: "8px",
      code_border_radius: "6px",
      shadow: "0 4px 6px rgba(0,0,0,0.07)"
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
      }
    },
    spacing: {
      section: "3rem",
      paragraph: "1.5rem",
      list_item: "0.5rem"
    },
    styling: {
      border_radius: "4px",
      code_border_radius: "3px",
      shadow: "0 1px 3px rgba(0,0,0,0.08)"
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
      }
    },
    spacing: {
      section: "3rem",
      paragraph: "1.5rem",
      list_item: "0.5rem"
    },
    styling: {
      border_radius: "8px",
      code_border_radius: "6px",
      shadow: "0 1px 3px rgba(0,0,0,0.1)"
    }
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
