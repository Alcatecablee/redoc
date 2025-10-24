import { type Documentation, type InsertDocumentation } from "@shared/schema";
import { db } from "./db";
import { documentations } from "../shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getDocumentation(id: number): Promise<Documentation | undefined>;
  getDocumentationBySubdomain(subdomain: string): Promise<Documentation | undefined>;
  getAllDocumentations(userId?: string): Promise<Documentation[]>;
  createDocumentation(data: InsertDocumentation): Promise<Documentation>;
  updateDocumentation(id: number, updates: Partial<Documentation>): Promise<Documentation>;
  deleteDocumentation(id: number, userId?: string): Promise<Documentation | undefined>;
}

// Drizzle-based PostgreSQL storage
class DrizzleStorage implements IStorage {
  async getDocumentation(id: number): Promise<Documentation | undefined> {
    if (!db) throw new Error('Database not initialized');
    const results = await db.select().from(documentations).where(eq(documentations.id, id)).limit(1);
    return results[0];
  }

  async getDocumentationBySubdomain(subdomain: string): Promise<Documentation | undefined> {
    if (!db) throw new Error('Database not initialized');
    const results = await db.select().from(documentations).where(eq(documentations.subdomain, subdomain)).limit(1);
    return results[0];
  }

  async getAllDocumentations(userId?: string): Promise<Documentation[]> {
    if (!db) throw new Error('Database not initialized');
    let query = db.select().from(documentations);
    
    if (userId) {
      // @ts-ignore - userId might be string or number depending on implementation
      query = query.where(eq(documentations.user_id, parseInt(userId)));
    }
    
    const results = await query.orderBy(desc(documentations.generatedAt));
    return results;
  }

  async createDocumentation(data: InsertDocumentation): Promise<Documentation> {
    if (!db) throw new Error('Database not initialized');
    const results = await db.insert(documentations).values(data).returning();
    return results[0];
  }

  async updateDocumentation(id: number, updates: Partial<Documentation>): Promise<Documentation> {
    if (!db) throw new Error('Database not initialized');
    const results = await db
      .update(documentations)
      .set(updates)
      .where(eq(documentations.id, id))
      .returning();
    
    if (results.length === 0) {
      throw new Error('Documentation not found');
    }
    
    return results[0];
  }

  async deleteDocumentation(id: number, userId?: string): Promise<Documentation | undefined> {
    if (!db) throw new Error('Database not initialized');
    
    let query = db.delete(documentations).where(eq(documentations.id, id));
    
    if (userId) {
      // @ts-ignore - userId might be string or number depending on implementation
      query = query.where(eq(documentations.user_id, parseInt(userId)));
    }
    
    const results = await query.returning();
    return results[0];
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
    const docs = userId ? this.docs.filter(d => d.user_id === parseInt(userId)) : this.docs;
    return [...docs].sort((a, b) => new Date((b as any).generatedAt || b.generatedAt).getTime() - new Date((a as any).generatedAt || a.generatedAt).getTime());
  }

  async createDocumentation(data: InsertDocumentation): Promise<Documentation> {
    const createdAt = new Date();
    const doc: any = {
      id: this.nextId++,
      url: data.url,
      title: data.title,
      content: data.content,
      user_id: (data as any).user_id || null,
      subdomain: (data as any).subdomain || null,
      theme_id: (data as any).theme_id || null,
      current_version: 1,
      search_vector: null,
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
    const idx = this.docs.findIndex(d => d.id === id && (userId ? d.user_id === parseInt(userId) : true));
    if (idx === -1) return undefined;
    const [removed] = this.docs.splice(idx, 1);
    return removed;
  }
}

export const storage: IStorage = db ? new DrizzleStorage() : new InMemoryStorage();
