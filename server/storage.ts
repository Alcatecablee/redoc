import { type Documentation, type InsertDocumentation, documentations } from "@shared/schema";
import { db } from './db';
import { eq, desc, and } from 'drizzle-orm';

export interface IStorage {
  getDocumentation(id: number): Promise<Documentation | undefined>;
  getDocumentationBySubdomain(subdomain: string): Promise<Documentation | undefined>;
  getAllDocumentations(userId?: string): Promise<Documentation[]>;
  createDocumentation(data: InsertDocumentation): Promise<Documentation>;
  updateDocumentation(id: number, updates: Partial<Documentation>): Promise<Documentation>;
  deleteDocumentation(id: number, userId?: string): Promise<Documentation | undefined>;
}

class DrizzleStorage implements IStorage {
  async getDocumentation(id: number): Promise<Documentation | undefined> {
    if (!db) throw new Error('Database not initialized');
    const results = await db.select().from(documentations).where(eq(documentations.id, id)).limit(1);
    return results[0] as Documentation | undefined;
  }

  async getDocumentationBySubdomain(subdomain: string): Promise<Documentation | undefined> {
    if (!db) throw new Error('Database not initialized');
    const results = await db.select().from(documentations).where(eq(documentations.subdomain, subdomain)).limit(1);
    return results[0] as Documentation | undefined;
  }

  async getAllDocumentations(userId?: string): Promise<Documentation[]> {
    if (!db) throw new Error('Database not initialized');
    
    if (userId) {
      const userIdNum = parseInt(userId);
      if (isNaN(userIdNum)) {
        throw new Error('Invalid userId provided');
      }
      const results = await db.select()
        .from(documentations)
        .where(eq(documentations.user_id, userIdNum))
        .orderBy(desc(documentations.generatedAt));
      return results as Documentation[];
    }
    
    const results = await db.select()
      .from(documentations)
      .orderBy(desc(documentations.generatedAt));
    return results as Documentation[];
  }

  async createDocumentation(data: InsertDocumentation): Promise<Documentation> {
    if (!db) throw new Error('Database not initialized');
    const results = await db.insert(documentations).values(data).returning();
    if (!results || results.length === 0) {
      throw new Error('Failed to create documentation');
    }
    return results[0] as Documentation;
  }

  async updateDocumentation(id: number, updates: Partial<Documentation>): Promise<Documentation> {
    if (!db) throw new Error('Database not initialized');
    const results = await db.update(documentations)
      .set(updates)
      .where(eq(documentations.id, id))
      .returning();
    if (!results || results.length === 0) {
      throw new Error('Documentation not found');
    }
    return results[0] as Documentation;
  }

  async deleteDocumentation(id: number, userId?: string): Promise<Documentation | undefined> {
    if (!db) throw new Error('Database not initialized');
    
    if (userId) {
      const userIdNum = parseInt(userId);
      if (isNaN(userIdNum)) {
        throw new Error('Invalid userId provided');
      }
      const results = await db.delete(documentations)
        .where(and(eq(documentations.id, id), eq(documentations.user_id, userIdNum)))
        .returning();
      return results && results[0] ? (results[0] as Documentation) : undefined;
    }
    
    const results = await db.delete(documentations)
      .where(eq(documentations.id, id))
      .returning();
    return results && results[0] ? (results[0] as Documentation) : undefined;
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
    if (userId) {
      const userIdNum = parseInt(userId);
      if (isNaN(userIdNum)) {
        return [];
      }
      const docs = this.docs.filter(d => d.user_id === userIdNum);
      return [...docs].sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
    }
    return [...this.docs].sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
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
    if (userId) {
      const userIdNum = parseInt(userId);
      if (isNaN(userIdNum)) {
        return undefined;
      }
      const idx = this.docs.findIndex(d => d.id === id && d.user_id === userIdNum);
      if (idx === -1) return undefined;
      const [removed] = this.docs.splice(idx, 1);
      return removed;
    }
    
    const idx = this.docs.findIndex(d => d.id === id);
    if (idx === -1) return undefined;
    const [removed] = this.docs.splice(idx, 1);
    return removed;
  }
}

export const storage: IStorage = db ? new DrizzleStorage() : new InMemoryStorage();
