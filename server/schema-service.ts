import { createAIProvider } from './ai-provider';
import { validateFAQSchema } from './utils/ai-validation';

export interface SchemaMarkup {
  '@context': string;
  '@type': string;
  [key: string]: any;
}

export interface FAQSchema extends SchemaMarkup {
  '@type': 'FAQPage';
  mainEntity: Array<{
    '@type': 'Question';
    name: string;
    acceptedAnswer: {
      '@type': 'Answer';
      text: string;
    };
  }>;
}

export interface HowToSchema extends SchemaMarkup {
  '@type': 'HowTo';
  name: string;
  description: string;
  step: Array<{
    '@type': 'HowToStep';
    name: string;
    text: string;
    url?: string;
  }>;
}

export interface VideoObjectSchema extends SchemaMarkup {
  '@type': 'VideoObject';
  name: string;
  description: string;
  contentUrl: string;
  thumbnailUrl: string;
  uploadDate: string;
  duration: string;
  publisher: {
    '@type': 'Organization';
    name: string;
  };
}

export interface SoftwareApplicationSchema extends SchemaMarkup {
  '@type': 'SoftwareApplication';
  name: string;
  description: string;
  url: string;
  applicationCategory: string;
  operatingSystem: string[];
  offers: {
    '@type': 'Offer';
    price: string;
    priceCurrency: string;
  };
}

export class SchemaService {
  private aiProvider: ReturnType<typeof createAIProvider>;

  constructor() {
    try {
      this.aiProvider = createAIProvider();
    } catch (error) {
      console.error('Failed to initialize AI provider for Schema:', error);
      this.aiProvider = null as any;
    }
  }

  /**
   * Generate comprehensive schema markup for documentation
   */
  async generateSchemaMarkup(
    productName: string,
    sections: Array<{ name: string; content: string }>,
    youtubeVideos: Array<{ title: string; url: string; thumbnail: string; duration: string }>,
    targetUrl: string
  ): Promise<SchemaMarkup[]> {
    try {
      console.log(`📋 Generating schema markup for ${productName}...`);

      const schemas: SchemaMarkup[] = [];

      // Generate FAQ schema if FAQ section exists
      const faqSection = sections.find(s => s.name.toLowerCase().includes('faq') || s.name.toLowerCase().includes('question'));
      if (faqSection) {
        const faqSchema = await this.generateFAQSchema(faqSection.content, targetUrl);
        if (faqSchema) schemas.push(faqSchema);
      }

      // Generate HowTo schema for tutorial sections
      const tutorialSections = sections.filter(s => 
        s.name.toLowerCase().includes('tutorial') || 
        s.name.toLowerCase().includes('guide') || 
        s.name.toLowerCase().includes('setup')
      );
      for (const section of tutorialSections) {
        const howToSchema = await this.generateHowToSchema(section, productName, targetUrl);
        if (howToSchema) schemas.push(howToSchema);
      }

      // Generate VideoObject schemas for YouTube videos
      for (const video of youtubeVideos) {
        const videoSchema = this.generateVideoObjectSchema(video, productName);
        schemas.push(videoSchema);
      }

      // Generate SoftwareApplication schema for the main product
      const softwareSchema = this.generateSoftwareApplicationSchema(productName, targetUrl);
      schemas.push(softwareSchema);

      console.log(`✅ Generated ${schemas.length} schema markups`);
      return schemas;

    } catch (error) {
      console.error('Schema markup generation error:', error);
      return [this.generateSoftwareApplicationSchema(productName, targetUrl)];
    }
  }

  /**
   * Generate FAQ schema from FAQ section content
   */
  private async generateFAQSchema(content: string, targetUrl: string): Promise<FAQSchema | null> {
    try {
      const prompt = `Extract FAQ questions and answers from this content and format as JSON-LD schema:

Content: ${content.substring(0, 2000)}

Task:
1. Extract 3-5 FAQ questions and answers
2. Format as FAQPage schema with Question and Answer types
3. Keep answers concise (1-2 sentences)

Output as JSON:
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "question text",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "answer text"
      }
    }
  ]
}`;

      if (!this.aiProvider) {
        return this.getDefaultFAQSchema(targetUrl);
      }

      const response = await this.aiProvider.generateCompletion([
        { role: 'user', content: prompt }
      ], { jsonMode: true });
      
      return validateFAQSchema(response.content);

    } catch (error) {
      console.error('FAQ schema generation error:', error);
      return this.getDefaultFAQSchema(targetUrl);
    }
  }

  /**
   * Generate HowTo schema from tutorial section
   */
  private async generateHowToSchema(
    section: { name: string; content: string },
    productName: string,
    targetUrl: string
  ): Promise<HowToSchema | null> {
    try {
      const prompt = `Extract step-by-step instructions from this tutorial content and format as JSON-LD HowTo schema:

Section: ${section.name}
Content: ${section.content.substring(0, 2000)}

Task:
1. Extract 3-7 step-by-step instructions
2. Format as HowTo schema with HowToStep types
3. Keep steps clear and actionable

Output as JSON:
{
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "tutorial title",
  "description": "brief description",
  "step": [
    {
      "@type": "HowToStep",
      "name": "step title",
      "text": "step description"
    }
  ]
}`;

      if (!this.aiProvider) {
        return this.getDefaultHowToSchema(section.name, productName, targetUrl);
      }

      const response = await this.aiProvider.generateCompletion([
        { role: 'user', content: prompt }
      ], { jsonMode: true });
      
      try {
        return JSON.parse(response.content);
      } catch (parseError) {
        console.error('HowTo schema parsing error:', parseError);
        return this.getDefaultHowToSchema(section.name, productName, targetUrl);
      }

    } catch (error) {
      console.error('HowTo schema generation error:', error);
      return this.getDefaultHowToSchema(section.name, productName, targetUrl);
    }
  }

  /**
   * Generate VideoObject schema for YouTube video
   */
  private generateVideoObjectSchema(
    video: { title: string; url: string; thumbnail: string; duration: string },
    productName: string
  ): VideoObjectSchema {
    return {
      '@context': 'https://schema.org',
      '@type': 'VideoObject',
      name: video.title,
      description: `${productName} tutorial video`,
      contentUrl: video.url,
      thumbnailUrl: video.thumbnail,
      uploadDate: new Date().toISOString(),
      duration: video.duration,
      publisher: {
        '@type': 'Organization',
        name: productName
      }
    };
  }

  /**
   * Generate SoftwareApplication schema for the main product
   */
  private generateSoftwareApplicationSchema(productName: string, targetUrl: string): SoftwareApplicationSchema {
    return {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: productName,
      description: `Comprehensive documentation and guides for ${productName}`,
      url: targetUrl,
      applicationCategory: 'DeveloperApplication',
      operatingSystem: ['Web', 'Windows', 'macOS', 'Linux'],
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD'
      }
    };
  }

  /**
   * Get default FAQ schema
   */
  private getDefaultFAQSchema(targetUrl: string): FAQSchema {
    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is this documentation about?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'This documentation provides comprehensive guides and tutorials for developers.'
          }
        }
      ]
    };
  }

  /**
   * Get default HowTo schema
   */
  private getDefaultHowToSchema(sectionName: string, productName: string, targetUrl: string): HowToSchema {
    return {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: `${productName} ${sectionName}`,
      description: `Step-by-step guide for ${productName} ${sectionName}`,
      step: [
        {
          '@type': 'HowToStep',
          name: 'Getting Started',
          text: 'Follow the setup instructions in the documentation.'
        },
        {
          '@type': 'HowToStep',
          name: 'Configuration',
          text: 'Configure the settings according to your requirements.'
        },
        {
          '@type': 'HowToStep',
          name: 'Testing',
          text: 'Test the implementation to ensure everything works correctly.'
        }
      ]
    };
  }

  /**
   * Validate schema markup
   */
  validateSchema(schema: SchemaMarkup): boolean {
    try {
      // Basic validation
      if (!schema['@context'] || !schema['@type']) {
        return false;
      }

      // Check required fields based on type
      switch (schema['@type']) {
        case 'FAQPage':
          return Array.isArray(schema.mainEntity) && schema.mainEntity.length > 0;
        case 'HowTo':
          return Array.isArray(schema.step) && schema.step.length > 0;
        case 'VideoObject':
          return !!(schema.name && schema.contentUrl);
        case 'SoftwareApplication':
          return !!(schema.name && schema.url);
        default:
          return true;
      }
    } catch (error) {
      console.error('Schema validation error:', error);
      return false;
    }
  }

  /**
   * Convert schema to JSON-LD string
   */
  schemaToJSONLD(schemas: SchemaMarkup[]): string {
    try {
      if (schemas.length === 1) {
        return JSON.stringify(schemas[0], null, 2);
      }
      return JSON.stringify(schemas, null, 2);
    } catch (error) {
      console.error('Schema to JSON-LD conversion error:', error);
      return '{}';
    }
  }
}

// Export singleton instance
export const schemaService = new SchemaService();
