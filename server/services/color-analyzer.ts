import { parseColor, rgbToHex, getContrastRatio, meetsWCAG_AA, type ThemeColors } from '@shared/themes';

export interface ColorCluster {
  centroid: { r: number; g: number; b: number };
  colors: string[];
  hex: string;
}

export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
}

export interface AccessibilityReport {
  passes: boolean;
  textOnBackground: { ratio: number; passes: boolean };
  textOnSurface: { ratio: number; passes: boolean };
  recommendations: string[];
}

export class ColorAnalyzer {
  /**
   * Perform K-means clustering on colors to find dominant groups
   */
  kMeansClustering(colors: string[], k: number = 5, maxIterations: number = 100): ColorCluster[] {
    // Convert colors to LAB color space for perceptual accuracy
    const labColors = colors.map(color => {
      const rgb = parseColor(color);
      return rgb ? { hex: color, ...this.rgbToLab(rgb.r, rgb.g, rgb.b) } : null;
    }).filter((c): c is { hex: string; l: number; a: number; b: number } => c !== null);

    if (labColors.length === 0) return [];

    // Initialize centroids randomly
    let centroids = this.initializeCentroids(labColors, k);
    let clusters: ColorCluster[] = [];
    let iterations = 0;

    while (iterations < maxIterations) {
      // Assign colors to nearest centroid
      const newClusters: { centroid: { l: number; a: number; b: number }; colors: { hex: string; l: number; a: number; b: number }[] }[] = 
        centroids.map(c => ({ centroid: c, colors: [] }));

      for (const color of labColors) {
        let minDist = Infinity;
        let clusterIndex = 0;

        for (let i = 0; i < centroids.length; i++) {
          const dist = this.labDistance(color, centroids[i]);
          if (dist < minDist) {
            minDist = dist;
            clusterIndex = i;
          }
        }

        newClusters[clusterIndex].colors.push(color);
      }

      // Update centroids
      let hasChanged = false;
      for (let i = 0; i < k; i++) {
        if (newClusters[i].colors.length === 0) continue;

        const newCentroid = this.calculateCentroid(newClusters[i].colors);
        if (!this.centroidsEqual(centroids[i], newCentroid)) {
          hasChanged = true;
          centroids[i] = newCentroid;
        }
      }

      if (!hasChanged) break;
      iterations++;
    }

    // Convert back to RGB and create final clusters
    clusters = centroids.map((centroid, i) => {
      const rgb = this.labToRgb(centroid.l, centroid.a, centroid.b);
      return {
        centroid: rgb,
        hex: rgbToHex(rgb.r, rgb.g, rgb.b),
        colors: [],
      };
    });

    // Assign original colors to their clusters
    for (const color of labColors) {
      let minDist = Infinity;
      let clusterIndex = 0;

      for (let i = 0; i < centroids.length; i++) {
        const dist = this.labDistance(color, centroids[i]);
        if (dist < minDist) {
          minDist = dist;
          clusterIndex = i;
        }
      }

      clusters[clusterIndex].colors.push(color.hex);
    }

    // Sort by cluster size (most colors first)
    return clusters.sort((a, b) => b.colors.length - a.colors.length);
  }

  /**
   * Build an accessible color palette from extracted colors
   */
  buildPalette(colors: string[]): ColorPalette {
    if (colors.length === 0) {
      return this.getDefaultPalette();
    }

    // Cluster colors to find dominant groups
    const clusters = this.kMeansClustering(colors, Math.min(5, colors.length));

    // Identify light and dark colors
    const lightColors = colors.filter(c => this.isLightColor(c));
    const darkColors = colors.filter(c => !this.isLightColor(c));

    // Build palette
    const primary = clusters[0]?.hex || colors[0];
    const secondary = clusters[1]?.hex || colors[1] || primary;
    const accent = clusters[2]?.hex || colors[2] || primary;

    // Choose background and text based on majority
    const isLightTheme = lightColors.length > darkColors.length;

    let background = isLightTheme ? '#ffffff' : '#0f172a';
    let surface = isLightTheme ? '#f8fafc' : '#1e293b';
    let text = isLightTheme ? '#0f172a' : '#f1f5f9';
    let textSecondary = isLightTheme ? '#64748b' : '#94a3b8';
    let border = isLightTheme ? '#e2e8f0' : '#334155';

    // Ensure accessibility
    const palette = this.ensureAccessibility({
      primary,
      secondary,
      accent,
      background,
      surface,
      text,
      textSecondary,
      border,
    });

    return palette;
  }

  /**
   * Ensure palette meets WCAG AA standards
   */
  ensureAccessibility(palette: ColorPalette): ColorPalette {
    const { text, background, surface } = palette;

    // Check text on background
    if (!meetsWCAG_AA(text, background)) {
      // Adjust text color
      palette.text = this.adjustColorForContrast(text, background, 4.5);
    }

    // Check text on surface
    if (!meetsWCAG_AA(text, surface)) {
      // Adjust surface color
      palette.surface = this.adjustColorForContrast(surface, text, 4.5, true);
    }

    // Check secondary text
    if (!meetsWCAG_AA(palette.textSecondary, background)) {
      palette.textSecondary = this.adjustColorForContrast(palette.textSecondary, background, 4.5);
    }

    return palette;
  }

  /**
   * Adjust a color to meet contrast requirements
   */
  private adjustColorForContrast(
    color: string,
    background: string,
    targetRatio: number,
    lighten: boolean = false
  ): string {
    const rgb = parseColor(color);
    if (!rgb) return color;

    let { l, a, b } = this.rgbToLab(rgb.r, rgb.g, rgb.b);

    // Adjust lightness until contrast is met
    const step = lighten ? 2 : -2;
    let iterations = 0;

    while (iterations < 50) {
      const testRgb = this.labToRgb(l, a, b);
      const testHex = rgbToHex(testRgb.r, testRgb.g, testRgb.b);
      const ratio = getContrastRatio(testHex, background);

      if (ratio >= targetRatio) {
        return testHex;
      }

      l += step;
      if (l < 0 || l > 100) break;
      iterations++;
    }

    return color; // Return original if adjustment fails
  }

  /**
   * Evaluate palette accessibility
   */
  evaluateAccessibility(palette: ColorPalette): AccessibilityReport {
    const textOnBg = getContrastRatio(palette.text, palette.background);
    const textOnSurface = getContrastRatio(palette.text, palette.surface);

    const recommendations: string[] = [];

    if (textOnBg < 4.5) {
      recommendations.push('Text on background fails WCAG AA (needs 4.5:1)');
    }

    if (textOnSurface < 4.5) {
      recommendations.push('Text on surface fails WCAG AA (needs 4.5:1)');
    }

    return {
      passes: textOnBg >= 4.5 && textOnSurface >= 4.5,
      textOnBackground: { ratio: textOnBg, passes: textOnBg >= 4.5 },
      textOnSurface: { ratio: textOnSurface, passes: textOnSurface >= 4.5 },
      recommendations,
    };
  }

  /**
   * Convert RGB to LAB color space (perceptual)
   */
  private rgbToLab(r: number, g: number, b: number): { l: number; a: number; b: number } {
    // RGB to XYZ
    let rNorm = r / 255;
    let gNorm = g / 255;
    let bNorm = b / 255;

    rNorm = rNorm > 0.04045 ? Math.pow((rNorm + 0.055) / 1.055, 2.4) : rNorm / 12.92;
    gNorm = gNorm > 0.04045 ? Math.pow((gNorm + 0.055) / 1.055, 2.4) : gNorm / 12.92;
    bNorm = bNorm > 0.04045 ? Math.pow((bNorm + 0.055) / 1.055, 2.4) : bNorm / 12.92;

    const x = (rNorm * 0.4124 + gNorm * 0.3576 + bNorm * 0.1805) * 100;
    const y = (rNorm * 0.2126 + gNorm * 0.7152 + bNorm * 0.0722) * 100;
    const z = (rNorm * 0.0193 + gNorm * 0.1192 + bNorm * 0.9505) * 100;

    // XYZ to LAB
    const xn = 95.047;
    const yn = 100.000;
    const zn = 108.883;

    let fx = x / xn;
    let fy = y / yn;
    let fz = z / zn;

    fx = fx > 0.008856 ? Math.pow(fx, 1/3) : (7.787 * fx + 16/116);
    fy = fy > 0.008856 ? Math.pow(fy, 1/3) : (7.787 * fy + 16/116);
    fz = fz > 0.008856 ? Math.pow(fz, 1/3) : (7.787 * fz + 16/116);

    const l = 116 * fy - 16;
    const a = 500 * (fx - fy);
    const bLab = 200 * (fy - fz);

    return { l, a, b: bLab };
  }

  /**
   * Convert LAB to RGB color space
   */
  private labToRgb(l: number, a: number, bLab: number): { r: number; g: number; b: number } {
    // LAB to XYZ
    let fy = (l + 16) / 116;
    let fx = a / 500 + fy;
    let fz = fy - bLab / 200;

    const xn = 95.047;
    const yn = 100.000;
    const zn = 108.883;

    const x3 = fx * fx * fx;
    const y3 = fy * fy * fy;
    const z3 = fz * fz * fz;

    const x = (x3 > 0.008856 ? x3 : (fx - 16/116) / 7.787) * xn;
    const y = (y3 > 0.008856 ? y3 : (fy - 16/116) / 7.787) * yn;
    const z = (z3 > 0.008856 ? z3 : (fz - 16/116) / 7.787) * zn;

    // XYZ to RGB
    let r = x *  0.032406 + y * -0.015372 + z * -0.004986;
    let g = x * -0.009689 + y *  0.018758 + z *  0.000415;
    let b = x *  0.000557 + y * -0.002040 + z *  0.010570;

    r = r > 0.0031308 ? 1.055 * Math.pow(r, 1/2.4) - 0.055 : 12.92 * r;
    g = g > 0.0031308 ? 1.055 * Math.pow(g, 1/2.4) - 0.055 : 12.92 * g;
    b = b > 0.0031308 ? 1.055 * Math.pow(b, 1/2.4) - 0.055 : 12.92 * b;

    return {
      r: Math.max(0, Math.min(255, Math.round(r * 255))),
      g: Math.max(0, Math.min(255, Math.round(g * 255))),
      b: Math.max(0, Math.min(255, Math.round(b * 255))),
    };
  }

  /**
   * Calculate LAB distance (Delta E)
   */
  private labDistance(
    c1: { l: number; a: number; b: number },
    c2: { l: number; a: number; b: number }
  ): number {
    const dl = c1.l - c2.l;
    const da = c1.a - c2.a;
    const db = c1.b - c2.b;
    return Math.sqrt(dl * dl + da * da + db * db);
  }

  /**
   * Initialize K-means centroids using K-means++ algorithm
   */
  private initializeCentroids(
    colors: { l: number; a: number; b: number }[],
    k: number
  ): { l: number; a: number; b: number }[] {
    const centroids: { l: number; a: number; b: number }[] = [];

    // Choose first centroid randomly
    centroids.push(colors[Math.floor(Math.random() * colors.length)]);

    // Choose remaining centroids
    while (centroids.length < k) {
      const distances = colors.map(color => {
        let minDist = Infinity;
        for (const centroid of centroids) {
          const dist = this.labDistance(color, centroid);
          minDist = Math.min(minDist, dist);
        }
        return minDist;
      });

      const totalDist = distances.reduce((sum, d) => sum + d, 0);
      let random = Math.random() * totalDist;

      for (let i = 0; i < colors.length; i++) {
        random -= distances[i];
        if (random <= 0) {
          centroids.push(colors[i]);
          break;
        }
      }
    }

    return centroids;
  }

  /**
   * Calculate centroid of a cluster
   */
  private calculateCentroid(colors: { l: number; a: number; b: number }[]): { l: number; a: number; b: number } {
    if (colors.length === 0) return { l: 50, a: 0, b: 0 };

    const sum = colors.reduce(
      (acc, c) => ({
        l: acc.l + c.l,
        a: acc.a + c.a,
        b: acc.b + c.b,
      }),
      { l: 0, a: 0, b: 0 }
    );

    return {
      l: sum.l / colors.length,
      a: sum.a / colors.length,
      b: sum.b / colors.length,
    };
  }

  /**
   * Check if two centroids are equal
   */
  private centroidsEqual(
    c1: { l: number; a: number; b: number },
    c2: { l: number; a: number; b: number },
    epsilon: number = 0.1
  ): boolean {
    return (
      Math.abs(c1.l - c2.l) < epsilon &&
      Math.abs(c1.a - c2.a) < epsilon &&
      Math.abs(c1.b - c2.b) < epsilon
    );
  }

  /**
   * Check if a color is light or dark
   */
  private isLightColor(color: string): boolean {
    const rgb = parseColor(color);
    if (!rgb) return false;

    // Use perceived brightness formula
    const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
    return brightness > 128;
  }

  /**
   * Get default palette
   */
  private getDefaultPalette(): ColorPalette {
    return {
      primary: '#2563eb',
      secondary: '#64748b',
      accent: '#0ea5e9',
      background: '#ffffff',
      surface: '#f8fafc',
      text: '#0f172a',
      textSecondary: '#475569',
      border: '#e2e8f0',
    };
  }
}
