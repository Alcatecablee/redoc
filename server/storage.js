import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
let supabaseClient = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false },
    });
}
else {
    console.warn('SUPABASE_URL or SUPABASE_ANON_KEY not set; Supabase storage disabled.');
}
class SupabaseStorage {
    client;
    constructor(client) {
        this.client = client;
    }
    async getDocumentation(id) {
        const { data, error } = await this.client.from('documentations').select('*').eq('id', id).limit(1).single();
        if (error)
            throw error;
        return data;
    }
    async getDocumentationBySubdomain(subdomain) {
        const { data, error } = await this.client.from('documentations').select('*').eq('subdomain', subdomain).limit(1).single();
        if (error) {
            if (error.code === 'PGRST116')
                return undefined; // Not found
            throw error;
        }
        return data;
    }
    async getAllDocumentations(userId) {
        let query = this.client.from('documentations').select('*').order('generated_at', { ascending: false });
        if (userId) {
            query = query.eq('user_id', userId);
        }
        const { data, error } = await query;
        if (error)
            throw error;
        return data || [];
    }
    async createDocumentation(data) {
        const { data: inserted, error } = await this.client.from('documentations').insert([{ ...data }]).select().single();
        if (error)
            throw error;
        return inserted;
    }
    async updateDocumentation(id, updates) {
        const { data, error } = await this.client
            .from('documentations')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    async deleteDocumentation(id, userId) {
        // If userId provided, ensure deletion only affects that user's doc
        let query = this.client.from('documentations').delete().eq('id', id).limit(1).select();
        if (userId) {
            query = query.eq('user_id', userId);
        }
        const { data, error } = await query;
        if (error)
            throw error;
        return (data && data[0]);
    }
}
// Simple in-memory fallback
class InMemoryStorage {
    docs = [];
    nextId = 1;
    async getDocumentation(id) {
        return this.docs.find((d) => d.id === id);
    }
    async getDocumentationBySubdomain(subdomain) {
        return this.docs.find((d) => d.subdomain === subdomain);
    }
    async getAllDocumentations(userId) {
        const docs = userId ? this.docs.filter(d => d.user_id === userId) : this.docs;
        return [...docs].sort((a, b) => new Date(b.generatedAt || b.generatedAt).getTime() - new Date(a.generatedAt || a.generatedAt).getTime());
    }
    async createDocumentation(data) {
        const createdAt = new Date().toISOString();
        const doc = {
            id: this.nextId++,
            url: data.url,
            title: data.title,
            content: data.content,
            user_id: data.user_id || null,
            subdomain: data.subdomain || null,
            generatedAt: createdAt,
        };
        this.docs.push(doc);
        return doc;
    }
    async updateDocumentation(id, updates) {
        const idx = this.docs.findIndex(d => d.id === id);
        if (idx === -1)
            throw new Error('Documentation not found');
        this.docs[idx] = { ...this.docs[idx], ...updates };
        return this.docs[idx];
    }
    async deleteDocumentation(id, userId) {
        const idx = this.docs.findIndex(d => d.id === id && (userId ? d.user_id === userId : true));
        if (idx === -1)
            return undefined;
        const [removed] = this.docs.splice(idx, 1);
        return removed;
    }
}
export const storage = supabaseClient ? new SupabaseStorage(supabaseClient) : new InMemoryStorage();
