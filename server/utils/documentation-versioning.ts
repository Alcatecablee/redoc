/**
 * Documentation Versioning Utilities
 * 
 * Provides version history tracking, rollback functionality,
 * and diff comparison for documentation.
 */

import { db } from '../db';
import { documentations, documentationVersions } from '../../shared/schema';
import { eq, desc, and } from 'drizzle-orm';
import crypto from 'crypto';

/**
 * Generate SHA-256 hash of content for change detection
 */
function generateContentHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Create a new version when documentation is updated
 */
export async function createDocumentationVersion(
  documentationId: number,
  versionNotes?: string,
  createdBy?: string
): Promise<{ versionId: number; versionNumber: number }> {
  if (!db) throw new Error('Database not initialized');

  // Get current documentation
  const [doc] = await db
    .select()
    .from(documentations)
    .where(eq(documentations.id, documentationId))
    .limit(1);

  if (!doc) {
    throw new Error(`Documentation ${documentationId} not found`);
  }

  // Calculate new version number
  const newVersionNumber = (doc.current_version || 0) + 1;
  const contentHash = generateContentHash(doc.content);

  // Mark all previous versions as not latest
  await db
    .update(documentationVersions)
    .set({ is_latest: false })
    .where(eq(documentationVersions.documentation_id, documentationId));

  // Create new version record
  const [newVersion] = await db
    .insert(documentationVersions)
    .values({
      documentation_id: documentationId,
      version: newVersionNumber,
      url: doc.url,
      title: doc.title,
      content: doc.content,
      user_id: doc.user_id,
      theme_id: doc.theme_id,
      subdomain: doc.subdomain,
      version_notes: versionNotes,
      content_hash: contentHash,
      is_latest: true,
      created_by: createdBy,
      created_at: new Date(),
    })
    .returning();

  // Update current version number in main table
  await db
    .update(documentations)
    .set({ current_version: newVersionNumber })
    .where(eq(documentations.id, documentationId));

  console.log(`✅ Created version ${newVersionNumber} for documentation ${documentationId}`);

  return {
    versionId: newVersion.id,
    versionNumber: newVersionNumber,
  };
}

/**
 * Get all versions for a documentation
 */
export async function getDocumentationVersions(documentationId: number) {
  if (!db) throw new Error('Database not initialized');

  const versions = await db
    .select()
    .from(documentationVersions)
    .where(eq(documentationVersions.documentation_id, documentationId))
    .orderBy(desc(documentationVersions.version));

  return versions;
}

/**
 * Get a specific version
 */
export async function getSpecificVersion(documentationId: number, version: number) {
  if (!db) throw new Error('Database not initialized');

  const [versionRecord] = await db
    .select()
    .from(documentationVersions)
    .where(
      and(
        eq(documentationVersions.documentation_id, documentationId),
        eq(documentationVersions.version, version)
      )
    )
    .limit(1);

  return versionRecord;
}

/**
 * Restore a previous version (creates a new version with old content)
 */
export async function restoreDocumentationVersion(
  documentationId: number,
  versionToRestore: number,
  restoredBy?: string
): Promise<{ newVersionNumber: number; restored: boolean }> {
  if (!db) throw new Error('Database not initialized');

  // Get the version to restore
  const oldVersion = await getSpecificVersion(documentationId, versionToRestore);
  if (!oldVersion) {
    throw new Error(`Version ${versionToRestore} not found`);
  }

  // Update main documentation with old content
  await db
    .update(documentations)
    .set({
      url: oldVersion.url,
      title: oldVersion.title,
      content: oldVersion.content,
      theme_id: oldVersion.theme_id,
      subdomain: oldVersion.subdomain,
    })
    .where(eq(documentations.id, documentationId));

  // Create new version with restored content
  const { versionNumber } = await createDocumentationVersion(
    documentationId,
    `Restored from version ${versionToRestore}`,
    restoredBy
  );

  console.log(`✅ Restored documentation ${documentationId} from version ${versionToRestore} → new version ${versionNumber}`);

  return {
    newVersionNumber: versionNumber,
    restored: true,
  };
}

/**
 * Compare two versions and generate a simple diff summary
 */
export async function compareVersions(
  documentationId: number,
  version1: number,
  version2: number
) {
  if (!db) throw new Error('Database not initialized');

  const [v1, v2] = await Promise.all([
    getSpecificVersion(documentationId, version1),
    getSpecificVersion(documentationId, version2),
  ]);

  if (!v1 || !v2) {
    throw new Error('One or both versions not found');
  }

  // Calculate differences
  const changes = {
    titleChanged: v1.title !== v2.title,
    urlChanged: v1.url !== v2.url,
    contentChanged: v1.content !== v2.content,
    themeChanged: v1.theme_id !== v2.theme_id,
    contentLengthDiff: v2.content.length - v1.content.length,
    versions: {
      older: {
        version: v1.version,
        title: v1.title,
        contentLength: v1.content.length,
        createdAt: v1.created_at,
      },
      newer: {
        version: v2.version,
        title: v2.title,
        contentLength: v2.content.length,
        createdAt: v2.created_at,
      },
    },
  };

  return changes;
}

/**
 * Check if content has changed (using hash)
 */
export async function hasContentChanged(
  documentationId: number,
  newContent: string
): Promise<boolean> {
  if (!db) throw new Error('Database not initialized');

  const [doc] = await db
    .select()
    .from(documentations)
    .where(eq(documentations.id, documentationId))
    .limit(1);

  if (!doc) return true; // No existing doc, so it's "changed"

  const currentHash = generateContentHash(doc.content);
  const newHash = generateContentHash(newContent);

  return currentHash !== newHash;
}

/**
 * Get version history summary
 */
export async function getVersionHistory(documentationId: number) {
  const versions = await getDocumentationVersions(documentationId);

  return {
    totalVersions: versions.length,
    currentVersion: versions.find(v => v.is_latest)?.version || 0,
    versions: versions.map(v => ({
      version: v.version,
      title: v.title,
      contentLength: v.content.length,
      createdAt: v.created_at,
      createdBy: v.created_by,
      versionNotes: v.version_notes,
      isLatest: v.is_latest,
    })),
  };
}
