import type { Theme } from '@shared/themes';
import { evaluateThemeAccessibility, mergeThemeWithDefaults, getDefaultTheme } from '@shared/themes';
import { db } from '../db';
import { themes } from '../../shared/schema';
import { eq, or, and, desc } from 'drizzle-orm';

export interface ThemeRecord {
  id: number;
  name: string;
  user_id: number;
  tokens: any; // JSONB
  is_default: string | null;
  source_url: string | null;
  confidence_score: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateThemeInput {
  name: string;
  userId: number;
  theme: Partial<Theme>;
  sourceUrl?: string;
  confidenceScore?: number;
}

export interface UpdateThemeInput {
  name?: string;
  theme?: Partial<Theme>;
  sourceUrl?: string;
  confidenceScore?: number;
}

export class ThemeService {
  /**
   * Get all themes for a user
   */
  async listThemes(userId: number): Promise<ThemeRecord[]> {
    if (!db) throw new Error('Database not initialized');
    
    const results = await db
      .select()
      .from(themes)
      .where(eq(themes.user_id, userId))
      .orderBy(desc(themes.created_at));

    return results as ThemeRecord[];
  }

  /**
   * Get all themes including system defaults (user_id = 0 for system)
   */
  async listAllThemes(userId: number): Promise<ThemeRecord[]> {
    if (!db) throw new Error('Database not initialized');
    
    const results = await db
      .select()
      .from(themes)
      .where(or(eq(themes.user_id, userId), eq(themes.user_id, 0)))
      .orderBy(desc(themes.created_at));

    return results as ThemeRecord[];
  }

  /**
   * Get a specific theme by ID
   */
  async getTheme(themeId: number, userId: number): Promise<ThemeRecord | null> {
    if (!db) throw new Error('Database not initialized');
    
    const results = await db
      .select()
      .from(themes)
      .where(
        and(
          eq(themes.id, themeId),
          or(eq(themes.user_id, userId), eq(themes.user_id, 0))
        )
      )
      .limit(1);

    return results.length > 0 ? (results[0] as ThemeRecord) : null;
  }

  /**
   * Get the default theme for a user
   */
  async getDefaultTheme(userId: number): Promise<ThemeRecord | null> {
    if (!db) throw new Error('Database not initialized');
    
    // Try to get user's default theme
    const userResults = await db
      .select()
      .from(themes)
      .where(
        and(
          eq(themes.user_id, userId),
          eq(themes.is_default, 'true')
        )
      )
      .limit(1);

    if (userResults.length > 0) {
      return userResults[0] as ThemeRecord;
    }

    // Fallback to system default (user_id = 0)
    const systemResults = await db
      .select()
      .from(themes)
      .where(
        and(
          eq(themes.user_id, 0),
          eq(themes.is_default, 'true')
        )
      )
      .limit(1);

    return systemResults.length > 0 ? (systemResults[0] as ThemeRecord) : null;
  }

  /**
   * Create a new theme
   */
  async createTheme(input: CreateThemeInput): Promise<ThemeRecord> {
    if (!db) throw new Error('Database not initialized');
    
    const { name, userId, theme, sourceUrl, confidenceScore } = input;

    // Merge with defaults to ensure all required fields
    const fullTheme = mergeThemeWithDefaults(theme);

    // Evaluate accessibility
    const accessibilityGrade = evaluateThemeAccessibility(fullTheme);

    const themeRecord = {
      name,
      user_id: userId,
      tokens: fullTheme,
      is_default: 'false',
      source_url: sourceUrl || null,
      confidence_score: confidenceScore ? String(confidenceScore) : null,
    };

    const results = await db
      .insert(themes)
      .values(themeRecord)
      .returning();

    return results[0] as ThemeRecord;
  }

  /**
   * Update an existing theme
   */
  async updateTheme(
    themeId: number,
    userId: number,
    updates: UpdateThemeInput
  ): Promise<ThemeRecord> {
    if (!db) throw new Error('Database not initialized');
    
    // Get existing theme
    const existing = await this.getTheme(themeId, userId);
    if (!existing) {
      throw new Error('Theme not found');
    }

    // Only allow updating own themes
    if (existing.user_id !== userId) {
      throw new Error('Permission denied');
    }

    const updateData: Partial<typeof themes.$inferInsert> = {
      updated_at: new Date(),
    };

    if (updates.name) {
      updateData.name = updates.name;
    }

    if (updates.theme) {
      // Merge with existing theme
      const existingTheme = existing.tokens as Theme;
      const mergedTheme = mergeThemeWithDefaults(updates.theme, existingTheme);
      updateData.tokens = mergedTheme as any;
    }

    if (updates.sourceUrl !== undefined) {
      updateData.source_url = updates.sourceUrl;
    }

    if (updates.confidenceScore !== undefined) {
      updateData.confidence_score = String(updates.confidenceScore);
    }

    const results = await db
      .update(themes)
      .set(updateData)
      .where(
        and(
          eq(themes.id, themeId),
          eq(themes.user_id, userId)
        )
      )
      .returning();

    if (results.length === 0) {
      throw new Error('Theme update failed');
    }

    return results[0] as ThemeRecord;
  }

  /**
   * Delete a theme
   */
  async deleteTheme(themeId: number, userId: number): Promise<boolean> {
    if (!db) throw new Error('Database not initialized');
    
    await db
      .delete(themes)
      .where(
        and(
          eq(themes.id, themeId),
          eq(themes.user_id, userId)
        )
      );

    return true;
  }

  /**
   * Set a theme as the user's default
   */
  async setDefaultTheme(themeId: number, userId: number): Promise<ThemeRecord> {
    if (!db) throw new Error('Database not initialized');
    
    // Verify theme exists and belongs to user
    const theme = await this.getTheme(themeId, userId);
    if (!theme) {
      throw new Error('Theme not found');
    }

    if (theme.user_id !== userId) {
      throw new Error('Permission denied');
    }

    // Unset any existing default for this user
    await db
      .update(themes)
      .set({ is_default: 'false' })
      .where(
        and(
          eq(themes.user_id, userId),
          eq(themes.is_default, 'true')
        )
      );

    // Set new default
    const results = await db
      .update(themes)
      .set({ is_default: 'true', updated_at: new Date() })
      .where(
        and(
          eq(themes.id, themeId),
          eq(themes.user_id, userId)
        )
      )
      .returning();

    if (results.length === 0) {
      throw new Error('Failed to set default theme');
    }

    return results[0] as ThemeRecord;
  }

  /**
   * Clone a theme (useful for customizing system themes)
   */
  async cloneTheme(
    themeId: number,
    userId: number,
    newName: string
  ): Promise<ThemeRecord> {
    const existing = await this.getTheme(themeId, userId);
    if (!existing) {
      throw new Error('Theme not found');
    }

    return this.createTheme({
      name: newName,
      userId,
      theme: existing.tokens as Theme,
      sourceUrl: existing.source_url || undefined,
    });
  }
}

// Export singleton instance
export const themeService = new ThemeService();
