import { documentations, type Documentation, type InsertDocumentation } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getDocumentation(id: number): Promise<Documentation | undefined>;
  getAllDocumentations(): Promise<Documentation[]>;
  createDocumentation(data: InsertDocumentation): Promise<Documentation>;
}

export class DatabaseStorage implements IStorage {
  async getDocumentation(id: number): Promise<Documentation | undefined> {
    const [doc] = await db.select().from(documentations).where(eq(documentations.id, id));
    return doc || undefined;
  }

  async getAllDocumentations(): Promise<Documentation[]> {
    return db.select().from(documentations).orderBy(desc(documentations.generatedAt));
  }

  async createDocumentation(data: InsertDocumentation): Promise<Documentation> {
    const [doc] = await db
      .insert(documentations)
      .values(data)
      .returning();
    return doc;
  }
}

export const storage = new DatabaseStorage();
