import { createClient } from '@supabase/supabase-js';
import { evaluateThemeAccessibility, mergeThemeWithDefaults } from '@shared/themes';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
let supabaseClient = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false },
    });
}
export class ThemeService {
    client;
    constructor(client) {
        if (!client && !supabaseClient) {
            throw new Error('Supabase client not initialized');
        }
        this.client = client || supabaseClient;
    }
    /**
     * Get all themes for a user
     */
    async listThemes(userId) {
        const { data, error } = await this.client
            .from('themes')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        if (error)
            throw error;
        return data || [];
    }
    /**
     * Get all themes including system defaults
     */
    async listAllThemes(userId) {
        const { data, error } = await this.client
            .from('themes')
            .select('*')
            .or(`user_id.eq.${userId},user_id.eq.system`)
            .order('created_at', { ascending: false });
        if (error)
            throw error;
        return data || [];
    }
    /**
     * Get a specific theme by ID
     */
    async getTheme(themeId, userId) {
        const { data, error } = await this.client
            .from('themes')
            .select('*')
            .eq('id', themeId)
            .or(`user_id.eq.${userId},user_id.eq.system`)
            .single();
        if (error) {
            if (error.code === 'PGRST116')
                return null; // Not found
            throw error;
        }
        return data;
    }
    /**
     * Get the default theme for a user
     */
    async getDefaultTheme(userId) {
        const { data, error } = await this.client
            .from('themes')
            .select('*')
            .eq('user_id', userId)
            .eq('is_default', 'true')
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                // No user default, get system default
                const { data: systemDefault, error: systemError } = await this.client
                    .from('themes')
                    .select('*')
                    .eq('user_id', 'system')
                    .eq('is_default', 'true')
                    .single();
                if (systemError)
                    return null;
                return systemDefault;
            }
            throw error;
        }
        return data;
    }
    /**
     * Create a new theme
     */
    async createTheme(input) {
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
        const { data, error } = await this.client
            .from('themes')
            .insert([themeRecord])
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    /**
     * Update an existing theme
     */
    async updateTheme(themeId, userId, updates) {
        // Get existing theme
        const existing = await this.getTheme(themeId, userId);
        if (!existing) {
            throw new Error('Theme not found');
        }
        // Only allow updating own themes
        if (existing.user_id !== userId) {
            throw new Error('Permission denied');
        }
        const updateData = {
            updated_at: new Date().toISOString(),
        };
        if (updates.name) {
            updateData.name = updates.name;
        }
        if (updates.theme) {
            // Merge with existing theme
            const existingTheme = existing.tokens;
            const mergedTheme = mergeThemeWithDefaults(updates.theme, existingTheme);
            updateData.tokens = mergedTheme;
        }
        if (updates.sourceUrl !== undefined) {
            updateData.source_url = updates.sourceUrl;
        }
        if (updates.confidenceScore !== undefined) {
            updateData.confidence_score = String(updates.confidenceScore);
        }
        const { data, error } = await this.client
            .from('themes')
            .update(updateData)
            .eq('id', themeId)
            .eq('user_id', userId)
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    /**
     * Delete a theme
     */
    async deleteTheme(themeId, userId) {
        const { error } = await this.client
            .from('themes')
            .delete()
            .eq('id', themeId)
            .eq('user_id', userId);
        if (error)
            throw error;
        return true;
    }
    /**
     * Set a theme as the user's default
     */
    async setDefaultTheme(themeId, userId) {
        // Verify theme exists and belongs to user
        const theme = await this.getTheme(themeId, userId);
        if (!theme) {
            throw new Error('Theme not found');
        }
        if (theme.user_id !== userId) {
            throw new Error('Permission denied');
        }
        // Unset any existing default for this user
        await this.client
            .from('themes')
            .update({ is_default: 'false' })
            .eq('user_id', userId)
            .eq('is_default', 'true');
        // Set new default
        const { data, error } = await this.client
            .from('themes')
            .update({ is_default: 'true', updated_at: new Date().toISOString() })
            .eq('id', themeId)
            .eq('user_id', userId)
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    /**
     * Clone a theme (useful for customizing system themes)
     */
    async cloneTheme(themeId, userId, newName) {
        const existing = await this.getTheme(themeId, userId);
        if (!existing) {
            throw new Error('Theme not found');
        }
        return this.createTheme({
            name: newName,
            userId,
            theme: existing.tokens,
            sourceUrl: existing.source_url || undefined,
        });
    }
}
// Export singleton instance
export const themeService = supabaseClient ? new ThemeService() : null;
