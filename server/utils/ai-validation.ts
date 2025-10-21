/**
 * AI Response Validation
 * 
 * Validates and sanitizes all AI-generated outputs using Zod schemas.
 * Prevents crashes from malformed AI outputs with fallback structures.
 */

import { z } from 'zod';

// ============================================================================
// Zod Schemas for AI Responses
// ============================================================================

// Documentation Structure Schema
export const extractedStructureSchema = z.object({
  title: z.string().default('Documentation'),
  description: z.string().default(''),
  sections: z.array(z.object({
    title: z.string(),
    content: z.string().optional(),
    subsections: z.array(z.object({
      title: z.string(),
      content: z.string().optional()
    })).optional()
  })).default([]),
  features: z.array(z.object({
    name: z.string(),
    description: z.string().optional()
  })).optional(),
  useCases: z.array(z.string()).optional(),
  technicalDetails: z.array(z.object({
    category: z.string(),
    details: z.string()
  })).optional()
});

// Dynamic Sections Schema
export const suggestedSectionsSchema = z.object({
  sections: z.array(z.object({
    title: z.string(),
    description: z.string().optional(),
    priority: z.enum(['high', 'medium', 'low']).optional(),
    category: z.string().optional()
  })).default([])
});

// Written Documentation Schema
export const writtenDocsSchema = z.object({
  title: z.string().default('Documentation'),
  description: z.string().default(''),
  sections: z.array(z.object({
    title: z.string(),
    content: z.string(),
    subsections: z.array(z.object({
      title: z.string(),
      content: z.string()
    })).optional()
  })).default([]),
  introduction: z.string().optional(),
  conclusion: z.string().optional()
});

// Metadata Schema (nested structure from Stage 3)
export const metadataSchema = z.object({
  metadata: z.object({
    title: z.string().default('Documentation'),
    description: z.string().default(''),
    keywords: z.array(z.string()).default([]),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    estimatedReadTime: z.number().optional()
  }).default({
    title: 'Documentation',
    description: '',
    keywords: []
  }),
  searchability: z.object({
    primary_tags: z.array(z.string()).default([]),
    search_keywords: z.array(z.string()).default([]),
    synonyms: z.array(z.string()).optional()
  }).default({
    primary_tags: [],
    search_keywords: []
  }),
  validation: z.object({
    status: z.string().default('pending')
  }).optional()
});

// SEO Metadata Schema (matches AI response format)
export const seoMetadataSchema = z.object({
  metaTitle: z.string(),
  metaDescription: z.string(),
  keywords: z.array(z.string()).default([]),
  ogTitle: z.string().optional(),
  ogDescription: z.string().optional(),
  ogImage: z.string().optional(),
  canonicalUrl: z.string().optional(),
  robots: z.string().optional(),
  structuredData: z.any().optional()
});

// FAQ Schema Schema
export const faqSchemaSchema = z.object({
  '@context': z.string().default('https://schema.org'),
  '@type': z.string().default('FAQPage'),
  mainEntity: z.array(z.object({
    '@type': z.string(),
    name: z.string(),
    acceptedAnswer: z.object({
      '@type': z.string(),
      text: z.string()
    })
  })).default([])
});

// Video Analysis Schema
export const videoAnalysisSchema = z.object({
  summary: z.string(),
  keyTopics: z.array(z.string()).default([]),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).default('intermediate'),
  category: z.string().default('tutorial'),
  actionableInsights: z.array(z.string()).default([]),
  relatedConcepts: z.array(z.string()).default([])
});

// ============================================================================
// Validation & Sanitization Functions
// ============================================================================

/**
 * Sanitize HTML/text content to prevent XSS
 */
function sanitizeText(text: string): string {
  if (typeof text !== 'string') return '';
  
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/`/g, '&#96;')
    .trim();
}

/**
 * Sanitize object recursively
 */
function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeText(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Validate and parse AI response with schema
 */
export function validateAIResponse<T>(
  content: string,
  schema: z.ZodType<T>,
  fallback: T,
  options: {
    sanitize?: boolean;
    logErrors?: boolean;
  } = {}
): T {
  const { sanitize = true, logErrors = true } = options;

  try {
    // First, try to parse as JSON
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1]);
      } else {
        throw parseError;
      }
    }

    // Validate with Zod schema
    const validated = schema.parse(parsed);

    // Sanitize if requested
    if (sanitize) {
      return sanitizeObject(validated) as T;
    }

    return validated;
  } catch (error: any) {
    if (logErrors) {
      console.error('❌ AI Response Validation Error:', error.message);
      console.error('   Content preview:', content.substring(0, 200));
    }
    
    // Return fallback structure
    return fallback;
  }
}

// ============================================================================
// Typed Validation Functions
// ============================================================================

export function validateExtractedStructure(content: string) {
  return validateAIResponse(
    content,
    extractedStructureSchema,
    {
      title: 'Documentation',
      description: 'Unable to extract structure',
      sections: []
    }
  );
}

export function validateSuggestedSections(content: string) {
  return validateAIResponse(
    content,
    suggestedSectionsSchema,
    {
      sections: [
        { title: 'Overview', description: 'Product overview', priority: 'high' as const },
        { title: 'Getting Started', description: 'Setup guide', priority: 'high' as const },
        { title: 'Features', description: 'Key features', priority: 'medium' as const },
        { title: 'API Reference', description: 'API documentation', priority: 'medium' as const }
      ]
    }
  );
}

export function validateWrittenDocs(content: string) {
  return validateAIResponse(
    content,
    writtenDocsSchema,
    {
      title: 'Documentation',
      description: 'Unable to generate documentation',
      sections: [
        { 
          title: 'Overview', 
          content: 'Documentation generation encountered an error. Please try again.' 
        }
      ]
    }
  );
}

export function validateMetadata(content: string) {
  return validateAIResponse(
    content,
    metadataSchema,
    {
      metadata: {
        title: 'Documentation',
        description: '',
        keywords: []
      },
      searchability: {
        primary_tags: [],
        search_keywords: []
      },
      validation: {
        status: 'pending'
      }
    }
  );
}

export function validateSEOMetadata(content: string) {
  return validateAIResponse(
    content,
    seoMetadataSchema,
    {
      metaTitle: 'Documentation',
      metaDescription: 'Product documentation and guides',
      keywords: []
    }
  );
}

export function validateFAQSchema(content: string) {
  return validateAIResponse(
    content,
    faqSchemaSchema,
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: []
    }
  );
}

export function validateVideoAnalysis(content: string) {
  return validateAIResponse(
    content,
    videoAnalysisSchema,
    {
      summary: 'Video tutorial',
      keyTopics: [],
      difficulty: 'intermediate' as const,
      category: 'tutorial',
      actionableInsights: [],
      relatedConcepts: []
    }
  );
}
