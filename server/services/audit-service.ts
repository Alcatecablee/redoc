/**
 * TIER 3.5: Audit Service
 * 
 * Provides comprehensive audit logging for compliance (GDPR, SOC2, HIPAA).
 * Immutable log storage with IP tracking, user agent capture, and export capabilities.
 */

import { db } from '../db';
import { activityLogs } from '../../shared/schema';
import { eq, and, gte, lte, desc, asc } from 'drizzle-orm';

export interface AuditLogEntry {
  userId?: number;
  organizationId?: number;
  action: string;
  resourceType: string;
  resourceId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditQuery {
  userId?: number;
  organizationId?: number;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface AuditLogReport {
  entries: any[];
  total: number;
  period?: {
    start: Date;
    end: Date;
  };
}

export class AuditService {
  /**
   * Log an audit event
   * This is the primary method for creating audit trail entries
   */
  async log(entry: AuditLogEntry): Promise<void> {
    if (!db) throw new Error('Database not initialized');

    await db.insert(activityLogs).values({
      user_id: entry.userId,
      organization_id: entry.organizationId,
      action: entry.action,
      resource_type: entry.resourceType,
      resource_id: entry.resourceId,
      metadata: entry.metadata,
      ip_address: entry.ipAddress,
      user_agent: entry.userAgent,
    });
  }

  /**
   * Specialized audit methods for common actions
   */

  async logDocumentationCreated(
    documentationId: number,
    userId?: number,
    ipAddress?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      userId,
      action: 'created',
      resourceType: 'documentation',
      resourceId: documentationId.toString(),
      metadata,
      ipAddress,
    });
  }

  async logDocumentationUpdated(
    documentationId: number,
    userId?: number,
    ipAddress?: string,
    changes?: Record<string, any>
  ): Promise<void> {
    await this.log({
      userId,
      action: 'updated',
      resourceType: 'documentation',
      resourceId: documentationId.toString(),
      metadata: { changes },
      ipAddress,
    });
  }

  async logDocumentationDeleted(
    documentationId: number,
    userId?: number,
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      userId,
      action: 'deleted',
      resourceType: 'documentation',
      resourceId: documentationId.toString(),
      ipAddress,
    });
  }

  async logDocumentationAccessed(
    documentationId: number,
    userId?: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      userId,
      action: 'accessed',
      resourceType: 'documentation',
      resourceId: documentationId.toString(),
      ipAddress,
      userAgent,
    });
  }

  async logApiKeyCreated(
    keyId: number,
    userId?: number,
    ipAddress?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      userId,
      action: 'created',
      resourceType: 'api_key',
      resourceId: keyId.toString(),
      metadata,
      ipAddress,
    });
  }

  async logApiKeyRevoked(
    keyId: number,
    userId?: number,
    ipAddress?: string,
    reason?: string
  ): Promise<void> {
    await this.log({
      userId,
      action: 'revoked',
      resourceType: 'api_key',
      resourceId: keyId.toString(),
      metadata: { reason },
      ipAddress,
    });
  }

  async logUserLogin(
    userId: number,
    ipAddress?: string,
    userAgent?: string,
    success: boolean = true
  ): Promise<void> {
    await this.log({
      userId,
      action: success ? 'login_success' : 'login_failed',
      resourceType: 'user',
      resourceId: userId.toString(),
      ipAddress,
      userAgent,
    });
  }

  async logUserLogout(
    userId: number,
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      userId,
      action: 'logout',
      resourceType: 'user',
      resourceId: userId.toString(),
      ipAddress,
    });
  }

  async logOrganizationCreated(
    organizationId: number,
    userId?: number,
    ipAddress?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      userId,
      organizationId,
      action: 'created',
      resourceType: 'organization',
      resourceId: organizationId.toString(),
      metadata,
      ipAddress,
    });
  }

  async logPermissionChanged(
    resourceType: string,
    resourceId: string,
    userId?: number,
    organizationId?: number,
    changes?: Record<string, any>,
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      userId,
      organizationId,
      action: 'permission_changed',
      resourceType,
      resourceId,
      metadata: { changes },
      ipAddress,
    });
  }

  /**
   * Query audit logs
   */
  async query(params: AuditQuery): Promise<AuditLogReport> {
    if (!db) throw new Error('Database not initialized');

    const {
      userId,
      organizationId,
      action,
      resourceType,
      resourceId,
      startDate,
      endDate,
      limit = 100,
      offset = 0,
    } = params;

    // Build filter conditions
    const conditions: any[] = [];

    if (userId !== undefined) {
      conditions.push(eq(activityLogs.user_id, userId));
    }

    if (organizationId !== undefined) {
      conditions.push(eq(activityLogs.organization_id, organizationId));
    }

    if (action) {
      conditions.push(eq(activityLogs.action, action));
    }

    if (resourceType) {
      conditions.push(eq(activityLogs.resource_type, resourceType));
    }

    if (resourceId) {
      conditions.push(eq(activityLogs.resource_id, resourceId));
    }

    if (startDate) {
      conditions.push(gte(activityLogs.created_at, startDate));
    }

    if (endDate) {
      conditions.push(lte(activityLogs.created_at, endDate));
    }

    const query = db
      .select()
      .from(activityLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(activityLogs.created_at))
      .limit(limit)
      .offset(offset);

    const entries = await query;

    return {
      entries,
      total: entries.length,
      period: startDate && endDate ? { start: startDate, end: endDate } : undefined,
    };
  }

  /**
   * Get audit logs for a specific user
   */
  async getUserAuditLog(
    userId: number,
    startDate?: Date,
    endDate?: Date,
    limit = 100
  ): Promise<AuditLogReport> {
    return this.query({ userId, startDate, endDate, limit });
  }

  /**
   * Get audit logs for an organization
   */
  async getOrganizationAuditLog(
    organizationId: number,
    startDate?: Date,
    endDate?: Date,
    limit = 100
  ): Promise<AuditLogReport> {
    return this.query({ organizationId, startDate, endDate, limit });
  }

  /**
   * Get audit logs for a specific resource
   */
  async getResourceAuditLog(
    resourceType: string,
    resourceId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<AuditLogReport> {
    return this.query({ resourceType, resourceId, startDate, endDate });
  }

  /**
   * Export audit logs to CSV format
   */
  exportToCSV(report: AuditLogReport): string {
    const rows: string[] = [];

    // Header
    rows.push('Timestamp,User ID,Organization ID,Action,Resource Type,Resource ID,IP Address,User Agent,Metadata');

    // Data rows
    report.entries.forEach(entry => {
      const row = [
        entry.created_at.toISOString(),
        entry.user_id || '',
        entry.organization_id || '',
        entry.action,
        entry.resource_type,
        entry.resource_id || '',
        entry.ip_address || '',
        `"${entry.user_agent || ''}"`,
        `"${JSON.stringify(entry.metadata || {})}"`,
      ];
      rows.push(row.join(','));
    });

    return rows.join('\n');
  }

  /**
   * Export audit logs to JSON format
   */
  exportToJSON(report: AuditLogReport): string {
    return JSON.stringify({
      period: report.period,
      total: report.total,
      entries: report.entries.map(entry => ({
        timestamp: entry.created_at.toISOString(),
        userId: entry.user_id,
        organizationId: entry.organization_id,
        action: entry.action,
        resourceType: entry.resource_type,
        resourceId: entry.resource_id,
        ipAddress: entry.ip_address,
        userAgent: entry.user_agent,
        metadata: entry.metadata,
      })),
    }, null, 2);
  }

  /**
   * Get audit log statistics
   */
  async getStatistics(
    startDate: Date,
    endDate: Date,
    userId?: number,
    organizationId?: number
  ): Promise<{
    totalEvents: number;
    eventsByAction: Record<string, number>;
    eventsByResourceType: Record<string, number>;
    uniqueUsers: number;
    uniqueIPs: number;
  }> {
    if (!db) throw new Error('Database not initialized');

    const { entries } = await this.query({
      userId,
      organizationId,
      startDate,
      endDate,
      limit: 10000, // Get more for statistics
    });

    // Calculate statistics
    const eventsByAction: Record<string, number> = {};
    const eventsByResourceType: Record<string, number> = {};
    const uniqueUsers = new Set<number>();
    const uniqueIPs = new Set<string>();

    entries.forEach(entry => {
      // Count by action
      eventsByAction[entry.action] = (eventsByAction[entry.action] || 0) + 1;

      // Count by resource type
      eventsByResourceType[entry.resource_type] =
        (eventsByResourceType[entry.resource_type] || 0) + 1;

      // Track unique users
      if (entry.user_id) {
        uniqueUsers.add(entry.user_id);
      }

      // Track unique IPs
      if (entry.ip_address) {
        uniqueIPs.add(entry.ip_address);
      }
    });

    return {
      totalEvents: entries.length,
      eventsByAction,
      eventsByResourceType,
      uniqueUsers: uniqueUsers.size,
      uniqueIPs: uniqueIPs.size,
    };
  }

  /**
   * Clean up old audit logs (for GDPR retention policies)
   * NOTE: This should be run with caution and proper authorization
   */
  async cleanupOldLogs(
    retentionDays: number,
    dryRun: boolean = true
  ): Promise<{ count: number; oldest: Date; dryRun: boolean }> {
    if (!db) throw new Error('Database not initialized');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const oldLogs = await db
      .select()
      .from(activityLogs)
      .where(lte(activityLogs.created_at, cutoffDate))
      .orderBy(asc(activityLogs.created_at))
      .limit(1);

    const count = oldLogs.length;
    const oldest = oldLogs[0]?.created_at || new Date();

    if (!dryRun && count > 0) {
      // Actually delete the logs (use with extreme caution!)
      // Commented out for safety - uncomment only if you're sure
      // await db.delete(activityLogs).where(lte(activityLogs.created_at, cutoffDate));
      console.warn('Log cleanup not implemented for safety. Implement manually if needed.');
    }

    return { count, oldest, dryRun };
  }
}

export const auditService = new AuditService();
