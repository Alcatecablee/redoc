import { type Documentation, type InsertDocumentation } from "@shared/schema";
import { createClient } from '@supabase/supabase-js';

export interface IStorage {
  getDocumentation(id: number): Promise<Documentation | undefined>;
  getDocumentationBySubdomain(subdomain: string): Promise<Documentation | undefined>;
  getAllDocumentations(userId?: string): Promise<Documentation[]>;
  createDocumentation(data: InsertDocumentation): Promise<Documentation>;
  updateDocumentation(id: number, updates: Partial<Documentation>): Promise<Documentation>;
  deleteDocumentation(id: number, userId?: string): Promise<Documentation | undefined>;
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

let supabaseClient: ReturnType<typeof createClient> | null = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
} else {
  console.warn('SUPABASE_URL or SUPABASE_ANON_KEY not set; Supabase storage disabled.');
}

class SupabaseStorage implements IStorage {
  private client: ReturnType<typeof createClient>;
  constructor(client: ReturnType<typeof createClient>) {
    this.client = client;
  }

  async getDocumentation(id: number): Promise<Documentation | undefined> {
    const { data, error } = await this.client.from('documentations').select('*').eq('id', id).limit(1).single();
    if (error) throw error;
    return data as Documentation | undefined;
  }

  async getDocumentationBySubdomain(subdomain: string): Promise<Documentation | undefined> {
    const { data, error} = await this.client.from('documentations').select('*').eq('subdomain', subdomain).limit(1).single();
    if (error) {
      if (error.code === 'PGRST116') return undefined; // Not found
      throw error;
    }
    return data as Documentation | undefined;
  }

  async getAllDocumentations(userId?: string): Promise<Documentation[]> {
    let query = this.client.from('documentations').select('*').order('generated_at', { ascending: false });
    if (userId) {
      query = query.eq('user_id', userId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data as any) || [];
  }

  async createDocumentation(data: InsertDocumentation): Promise<Documentation> {
    const { data: inserted, error } = await this.client.from('documentations').insert([{ ...data }]).select().single();
    if (error) throw error;
    return inserted as Documentation;
  }

  async updateDocumentation(id: number, updates: Partial<Documentation>): Promise<Documentation> {
    const { data, error } = await this.client
      .from('documentations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Documentation;
  }

  async deleteDocumentation(id: number, userId?: string): Promise<Documentation | undefined> {
    // If userId provided, ensure deletion only affects that user's doc
    let query = this.client.from('documentations').delete().eq('id', id).limit(1).select();
    if (userId) {
      query = query.eq('user_id', userId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data && data[0]) as Documentation | undefined;
  }
}

// Simple in-memory fallback
class InMemoryStorage implements IStorage {
  private docs: Documentation[] = [];
  private nextId = 1;

  async getDocumentation(id: number): Promise<Documentation | undefined> {
    return this.docs.find((d) => d.id === id);
  }

  async getDocumentationBySubdomain(subdomain: string): Promise<Documentation | undefined> {
    return this.docs.find((d) => (d as any).subdomain === subdomain);
  }

  async getAllDocumentations(userId?: string): Promise<Documentation[]> {
    const docs = userId ? this.docs.filter(d => d.user_id === userId) : this.docs;
    return [...docs].sort((a, b) => new Date((b as any).generatedAt || b.generatedAt).getTime() - new Date((a as any).generatedAt || a.generatedAt).getTime());
  }

  async createDocumentation(data: InsertDocumentation): Promise<Documentation> {
    const createdAt = new Date().toISOString();
    const doc: any = {
      id: this.nextId++,
      url: data.url,
      title: data.title,
      content: data.content,
      user_id: (data as any).user_id || null,
      subdomain: (data as any).subdomain || null,
      generatedAt: createdAt,
    };
    this.docs.push(doc);
    return doc as Documentation;
  }

  async updateDocumentation(id: number, updates: Partial<Documentation>): Promise<Documentation> {
    const idx = this.docs.findIndex(d => d.id === id);
    if (idx === -1) throw new Error('Documentation not found');
    this.docs[idx] = { ...this.docs[idx], ...updates };
    return this.docs[idx];
  }

  async deleteDocumentation(id: number, userId?: string): Promise<Documentation | undefined> {
    const idx = this.docs.findIndex(d => d.id === id && (userId ? d.user_id === userId : true));
    if (idx === -1) return undefined;
    const [removed] = this.docs.splice(idx, 1);
    return removed;
  }
}

export const storage: IStorage = supabaseClient ? new SupabaseStorage(supabaseClient) : new InMemoryStorage();
