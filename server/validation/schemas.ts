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

/**
 * Custom Orders Validation Schemas
 * For Configure Your Project feature
 */

// URL validation with additional checks
const urlValidation = z.string()
  .min(10, 'URL is too short')
  .max(2000, 'URL is too long')
  .refine(isValidUrl, 'Invalid URL format - must start with http:// or https://')
  .refine(
    (url) => !url.includes('localhost') && !url.includes('127.0.0.1'),
    'Cannot use localhost URLs for custom orders'
  )
  .refine(
    (url) => {
      try {
        const parsed = new URL(url);
        return parsed.hostname.includes('.') || parsed.hostname === 'localhost';
      } catch {
        return false;
      }
    },
    'URL must have a valid domain name'
  );

// GitHub repo validation
const githubRepoValidation = z.string()
  .regex(/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/, 
    'GitHub repo must be in format: username/repository'
  )
  .optional();

// Custom requirements validation with length limits
const customRequirementsValidation = z.string()
  .max(2000, 'Custom requirements must be under 2000 characters')
  .optional();

// Email validation
const emailValidation = z.string()
  .email('Invalid email address')
  .min(5, 'Email is too short')
  .max(255, 'Email is too long');

// Shared validation components
const tierValidation = z.enum(['custom', 'standard', 'professional', 'enterprise'], {
  errorMap: () => ({ message: 'Invalid tier selection' })
});

const sectionsValidation = z.enum(['8-12', '13-20', '20+'], {
  errorMap: () => ({ message: 'Invalid section count selection' })
});

const sourceDepthValidation = z.enum(['basic', 'standard', 'deep'], {
  errorMap: () => ({ message: 'Invalid research depth selection' })
});

const deliveryValidation = z.enum(['standard', 'rush', 'same-day'], {
  errorMap: () => ({ message: 'Invalid delivery speed selection' })
});

const formatsValidation = z.array(z.enum(['pdf', 'markdown', 'html', 'docx', 'json']))
  .min(1, 'At least one export format is required')
  .max(5, 'Maximum 5 export formats allowed');

const brandingValidation = z.enum(['basic', 'advanced'], {
  errorMap: () => ({ message: 'Invalid branding level selection' })
});

const youtubeOptionsValidation = z.array(z.enum(['youtubeSearch', 'youtubeApi', 'youtubeTranscripts']))
  .max(3, 'Maximum 3 YouTube options allowed')
  .optional();

const seoOptionsValidation = z.array(z.enum([
  'seoMetadata', 
  'schemaMarkup', 
  'keywordTargeting', 
  'sitemapIndexing', 
  'contentRefresh'
]))
  .max(5, 'Maximum 5 SEO options allowed')
  .optional();

const enterpriseFeaturesValidation = z.array(z.enum([
  'multiRegion',
  'prioritySupport',
  'customIntegrations',
  'dedicatedAccount',
  'slaGuarantee'
]))
  .max(5, 'Maximum 5 enterprise features allowed')
  .optional();

// Quote request schema (email optional - just for pricing calculation)
export const quoteRequestSchema = z.object({
  // Project Details
  url: urlValidation,
  githubRepo: githubRepoValidation,
  
  // Configuration
  tier: tierValidation,
  sections: sectionsValidation,
  sourceDepth: sourceDepthValidation,
  delivery: deliveryValidation,
  formats: formatsValidation,
  branding: brandingValidation,
  youtubeOptions: youtubeOptionsValidation,
  seoOptions: seoOptionsValidation,
  enterpriseFeatures: enterpriseFeaturesValidation,
  customRequirements: customRequirementsValidation,
  
  // Currency
  currency: z.enum(['USD', 'ZAR']).default('USD'),
  
  // Optional discount code
  discountCode: z.string()
    .min(3, 'Discount code must be at least 3 characters')
    .max(50, 'Discount code is too long')
    .transform((v) => v.toUpperCase())
    .optional(),
  
  // Email is optional for quotes
  email: emailValidation.optional(),
});

// Create custom order schema (for actual order creation - email required)
export const createCustomOrderSchema = z.object({
  // Customer Info
  email: emailValidation, // Required for orders
  
  // Project Details
  url: urlValidation,
  githubRepo: githubRepoValidation,
  
  // Configuration
  tier: z.enum(['custom', 'standard', 'professional', 'enterprise'], {
    errorMap: () => ({ message: 'Invalid tier selection' })
  }),
  sections: z.enum(['8-12', '13-20', '20+'], {
    errorMap: () => ({ message: 'Invalid section count selection' })
  }),
  sourceDepth: z.enum(['basic', 'standard', 'deep'], {
    errorMap: () => ({ message: 'Invalid research depth selection' })
  }),
  delivery: z.enum(['standard', 'rush', 'same-day'], {
    errorMap: () => ({ message: 'Invalid delivery speed selection' })
  }),
  formats: z.array(z.enum(['pdf', 'markdown', 'html', 'docx', 'json']))
    .min(1, 'At least one export format is required')
    .max(5, 'Maximum 5 export formats allowed'),
  branding: z.enum(['basic', 'advanced'], {
    errorMap: () => ({ message: 'Invalid branding level selection' })
  }),
  youtubeOptions: z.array(z.enum(['youtubeSearch', 'youtubeApi', 'youtubeTranscripts']))
    .max(3, 'Maximum 3 YouTube options allowed')
    .optional(),
  seoOptions: z.array(z.enum([
    'seoMetadata', 
    'schemaMarkup', 
    'keywordTargeting', 
    'sitemapIndexing', 
    'contentRefresh'
  ]))
    .max(5, 'Maximum 5 SEO options allowed')
    .optional(),
  enterpriseFeatures: z.array(z.enum([
    'accountManager', 
    'revisions', 
    'apiPriority', 
    'compliance'
  ]))
    .max(4, 'Maximum 4 enterprise features allowed')
    .optional(),
  
  // Custom Requirements
  customRequirements: customRequirementsValidation,
  
  // Currency
  currency: z.enum(['USD', 'ZAR']).default('USD'),
  
  // Optional discount code
  discountCode: z.string()
    .min(3, 'Discount code must be at least 3 characters')
    .max(50, 'Discount code is too long')
    .transform((v) => v.toUpperCase())
    .optional(),
})
// Business rule validations
.refine(
  (data) => {
    // Same-day delivery not available for 20+ sections
    if (data.delivery === 'same-day' && data.sections === '20+') {
      return false;
    }
    return true;
  },
  {
    message: 'Same-day delivery is not available for 20+ sections. Please select rush (24 hours) or standard delivery.',
    path: ['delivery']
  }
)
.refine(
  (data) => {
    // Enterprise features only available for professional and enterprise tiers
    if (data.enterpriseFeatures && data.enterpriseFeatures.length > 0) {
      if (data.tier !== 'professional' && data.tier !== 'enterprise' && data.tier !== 'custom') {
        return false;
      }
    }
    return true;
  },
  {
    message: 'Enterprise features are only available for Professional, Enterprise, or Custom tiers',
    path: ['enterpriseFeatures']
  }
);

// Pricing calculation schema
export const calculatePricingSchema = z.object({
  tier: z.enum(['custom', 'standard', 'professional', 'enterprise']).optional(),
  sections: z.enum(['8-12', '13-20', '20+']),
  sourceDepth: z.enum(['basic', 'standard', 'deep']),
  delivery: z.enum(['standard', 'rush', 'same-day']),
  formats: z.array(z.string()),
  branding: z.enum(['basic', 'advanced']),
  customRequirements: z.string().optional(),
  currency: z.enum(['USD', 'ZAR']).default('USD'),
  youtubeOptions: z.array(z.string()).optional(),
  seoOptions: z.array(z.string()).optional(),
  enterpriseFeatures: z.array(z.string()).optional(),
  discountCode: z.string().optional(),
});

// Discount code validation schema
export const validateDiscountCodeSchema = z.object({
  code: z.string()
    .min(3, 'Discount code must be at least 3 characters')
    .max(50, 'Discount code is too long')
    .transform((v) => v.toUpperCase()),
  orderAmount: z.number()
    .min(0, 'Order amount must be positive')
    .optional(),
});

// Create discount code schema (admin only)
export const createDiscountCodeSchema = z.object({
  code: z.string()
    .min(3, 'Code must be at least 3 characters')
    .max(50, 'Code is too long')
    .regex(/^[A-Z0-9_-]+$/, 'Code must contain only uppercase letters, numbers, hyphens, and underscores')
    .transform((v) => v.toUpperCase()),
  description: z.string()
    .max(500, 'Description is too long')
    .optional(),
  discountType: z.enum(['percentage', 'fixed'], {
    errorMap: () => ({ message: 'Discount type must be percentage or fixed' })
  }),
  discountValue: z.number()
    .min(0.01, 'Discount value must be greater than 0')
    .max(10000, 'Discount value is too high')
    .refine(
      (val, ctx) => {
        // If percentage, must be between 0-100
        const discountType = (ctx as any).parent?.discountType;
        if (discountType === 'percentage') {
          return val <= 100;
        }
        return true;
      },
      'Percentage discount must be between 0 and 100'
    ),
  minOrderAmount: z.number()
    .min(0, 'Minimum order amount cannot be negative')
    .optional(),
  maxUses: z.number()
    .int('Maximum uses must be a whole number')
    .min(1, 'Maximum uses must be at least 1')
    .optional(),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
  isActive: z.boolean().default(true),
});

// Update order status schema (admin only)
export const updateOrderStatusSchema = z.object({
  status: z.enum(['quote', 'pending_payment', 'processing', 'completed', 'cancelled'], {
    errorMap: () => ({ message: 'Invalid order status' })
  }).optional(),
  fulfillmentStatus: z.enum(['not_started', 'in_progress', 'delivered'], {
    errorMap: () => ({ message: 'Invalid fulfillment status' })
  }).optional(),
  paymentStatus: z.enum(['pending', 'paid', 'failed', 'refunded'], {
    errorMap: () => ({ message: 'Invalid payment status' })
  }).optional(),
  adminNotes: z.string().max(2000, 'Admin notes too long').optional(),
  deliveryUrl: z.string().url('Invalid delivery URL').optional(),
});

// Order query/filter schema
export const orderQuerySchema = z.object({
  status: z.enum(['quote', 'pending_payment', 'processing', 'completed', 'cancelled']).optional(),
  paymentStatus: z.enum(['pending', 'paid', 'failed', 'refunded']).optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
  minAmount: z.coerce.number().min(0).optional(),
  maxAmount: z.coerce.number().min(0).optional(),
  tier: z.enum(['custom', 'standard', 'professional', 'enterprise']).optional(),
}).merge(paginationSchema);

// Type exports
export type CreateCustomOrderInput = z.infer<typeof createCustomOrderSchema>;
export type CalculatePricingInput = z.infer<typeof calculatePricingSchema>;
export type ValidateDiscountCodeInput = z.infer<typeof validateDiscountCodeSchema>;
export type CreateDiscountCodeInput = z.infer<typeof createDiscountCodeSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type OrderQueryInput = z.infer<typeof orderQuerySchema>;
