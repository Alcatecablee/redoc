import { documentations, type Documentation, type InsertDocumentation } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getDocumentation(id: number): Promise<Documentation | undefined>;
  getAllDocumentations(): Promise<Documentation[]>;
  createDocumentation(data: InsertDocumentation): Promise<Documentation>;
}

// Storage backed by the real database (Drizzle) - only used when db is available
export class DatabaseStorage implements IStorage {
  async getDocumentation(id: number): Promise<Documentation | undefined> {
    if (!db) throw new Error('Database not initialized');
    const [doc] = await db.select().from(documentations).where(eq(documentations.id, id));
    return doc || undefined;
  }

  async getAllDocumentations(): Promise<Documentation[]> {
    if (!db) throw new Error('Database not initialized');
    return db.select().from(documentations).orderBy(desc(documentations.generatedAt));
  }

  async createDocumentation(data: InsertDocumentation): Promise<Documentation> {
    if (!db) throw new Error('Database not initialized');
    const [doc] = await db
      .insert(documentations)
      .values(data)
      .returning();
    return doc;
  }
}

// In-memory fallback storage for development when DATABASE_URL is not provided
class InMemoryStorage implements IStorage {
  private docs: Documentation[] = [];
  private nextId = 1;

  async getDocumentation(id: number): Promise<Documentation | undefined> {
    return this.docs.find((d) => d.id === id);
  }

  async getAllDocumentations(): Promise<Documentation[]> {
    // Return a shallow copy sorted by generatedAt desc
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

export const storage: IStorage = db ? new DatabaseStorage() : new InMemoryStorage();
