/**
 * API Input Validation Schemas
 * 
 * Comprehensive Zod schemas for all API endpoints.
 * Prevents malformed data, injection attacks, and improves error messages.
 */

import { z } from 'zod';

/**
 * Documentation Generation Schemas
 */
export const generateDocsSchema = z.object({
  url: z.string()
    .url({ message: 'Invalid URL format' })
    .min(10, 'URL too short')
    .max(2000, 'URL too long')
    .refine(
      (url) => {
        try {
          const parsed = new URL(url);
          return ['http:', 'https:'].includes(parsed.protocol);
        } catch {
          return false;
        }
      },
      { message: 'URL must use HTTP or HTTPS protocol' }
    ),
  sessionId: z.string().uuid().optional(),
  subdomain: z.string()
    .min(3, 'Subdomain must be at least 3 characters')
    .max(63, 'Subdomain too long')
    .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, 
      'Subdomain must be lowercase alphanumeric and hyphens only'
    )
    .optional(),
  options: z.object({
    includeImages: z.boolean().optional(),
    includeSources: z.boolean().optional(),
    maxDepth: z.number().int().min(1).max(10).optional(),
  }).optional(),
});

export type GenerateDocsInput = z.infer<typeof generateDocsSchema>;

/**
 * Organization Schemas
 */
export const createOrganizationSchema = z.object({
  name: z.string()
    .min(2, 'Organization name must be at least 2 characters')
    .max(100, 'Organization name too long')
    .trim(),
  slug: z.string()
    .min(3, 'Slug must be at least 3 characters')
    .max(50, 'Slug too long')
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only')
    .trim(),
  description: z.string().max(500, 'Description too long').optional(),
});

export const addOrganizationMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['owner', 'admin', 'member'], {
    errorMap: () => ({ message: 'Role must be owner, admin, or member' })
  }),
});

export const updateOrganizationMemberSchema = z.object({
  role: z.enum(['owner', 'admin', 'member']),
});

/**
 * API Key Schemas
 */
export const createApiKeySchema = z.object({
  name: z.string()
    .min(3, 'API key name must be at least 3 characters')
    .max(100, 'API key name too long')
    .trim(),
  description: z.string().max(500, 'Description too long').optional(),
  scopes: z.array(z.enum(['read', 'write', 'admin']))
    .min(1, 'At least one scope required')
    .default(['read', 'write']),
  expiresIn: z.number().int().min(1).max(365).optional(), // days
});

/**
 * Webhook Schemas
 */
export const createWebhookSchema = z.object({
  url: z.string().url('Invalid webhook URL'),
  events: z.array(z.enum([
    'documentation.created',
    'documentation.updated', 
    'documentation.deleted',
    'job.completed',
    'job.failed',
  ])).min(1, 'At least one event required'),
  secret: z.string().min(16, 'Webhook secret must be at least 16 characters').optional(),
  isActive: z.boolean().default(true),
});

export const updateWebhookSchema = z.object({
  url: z.string().url().optional(),
  events: z.array(z.string()).min(1).optional(),
  isActive: z.boolean().optional(),
});

/**
 * Support Ticket Schemas
 */
export const createSupportTicketSchema = z.object({
  subject: z.string()
    .min(5, 'Subject must be at least 5 characters')
    .max(200, 'Subject too long'),
  message: z.string()
    .min(10, 'Message must be at least 10 characters')
    .max(5000, 'Message too long'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  category: z.enum([
    'bug',
    'feature_request',
    'billing',
    'technical_support',
    'other'
  ]).default('other'),
});

export const createSupportMessageSchema = z.object({
  message: z.string()
    .min(1, 'Message cannot be empty')
    .max(5000, 'Message too long'),
});

/**
 * Branding Settings Schemas
 */
export const updateBrandingSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').optional(),
  logoUrl: z.string().url('Invalid logo URL').max(500).optional(),
  faviconUrl: z.string().url('Invalid favicon URL').max(500).optional(),
  customDomain: z.string()
    .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/, 
      'Invalid domain format'
    )
    .optional(),
  companyName: z.string().min(1).max(100).optional(),
});

/**
 * User Profile Schemas
 */
export const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name required').max(100, 'Name too long').optional(),
  bio: z.string().max(500, 'Bio too long').optional(),
  company: z.string().max(100, 'Company name too long').optional(),
  website: z.string().url('Invalid website URL').max(200).optional(),
});

/**
 * Pagination Schema
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().max(50).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Search Schema
 */
export const searchSchema = z.object({
  query: z.string()
    .min(1, 'Search query required')
    .max(200, 'Search query too long'),
  filters: z.record(z.any()).optional(),
}).merge(paginationSchema);

/**
 * ID Parameter Schemas
 */
export const idParamSchema = z.object({
  id: z.coerce.number().int().positive('Invalid ID'),
});

export const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid UUID'),
});

export const slugParamSchema = z.object({
  slug: z.string()
    .min(1, 'Slug required')
    .max(100, 'Slug too long')
    .regex(/^[a-z0-9-]+$/, 'Invalid slug format'),
});

/**
 * Export Documentation Schema
 */
export const exportDocsSchema = z.object({
  format: z.enum(['pdf', 'markdown', 'html'], {
    errorMap: () => ({ message: 'Format must be pdf, markdown, or html' })
  }),
  includeImages: z.boolean().default(true),
  includeSources: z.boolean().default(true),
});

/**
 * Common validation helpers
 */
export const sanitizeString = (str: string): string => {
  return str.trim().replace(/\s+/g, ' ');
};

export const sanitizeHtml = (html: string): string => {
  return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
};

export const isValidUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};
