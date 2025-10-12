import { type Documentation, type InsertDocumentation } from "@shared/schema";
import { createClient } from '@supabase/supabase-js';

export interface IStorage {
  getDocumentation(id: number): Promise<Documentation | undefined>;
  getAllDocumentations(userId?: string): Promise<Documentation[]>;
  createDocumentation(data: InsertDocumentation): Promise<Documentation>;
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
}

// Simple in-memory fallback
class InMemoryStorage implements IStorage {
  private docs: Documentation[] = [];
  private nextId = 1;

  async getDocumentation(id: number): Promise<Documentation | undefined> {
    return this.docs.find((d) => d.id === id);
  }

  async getAllDocumentations(): Promise<Documentation[]> {
    return [...this.docs].sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
  }

  async createDocumentation(data: InsertDocumentation): Promise<Documentation> {
    const createdAt = new Date().toISOString();
    const doc: any = {
      id: this.nextId++,
      url: data.url,
      title: data.title,
      content: data.content,
      generatedAt: createdAt,
    };
    this.docs.push(doc);
    return doc as Documentation;
  }
}

export const storage: IStorage = supabaseClient ? new SupabaseStorage(supabaseClient) : new InMemoryStorage();
