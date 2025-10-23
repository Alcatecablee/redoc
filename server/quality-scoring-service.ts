/**
 * Documentation Quality Scoring Service
 * Grades documentation on multiple criteria (0-100 scale)
 */

export interface QualityScore {
  overall: number;
  breakdown: {
    codeExamples: number;
    readability: number;
    completeness: number;
    troubleshooting: number;
    visualAids: number;
    seo: number;
  };
  improvements: string[];
  strengths: string[];
}

export interface DocumentationContent {
  sections: Array<{
    name: string;
    content: string;
    codeBlocks?: any[];
  }>;
  images?: any[];
  metadata?: {
    title?: string;
    description?: string;
  };
}

class QualityScoringService {
  /**
   * Analyze existing documentation and return quality score
   */
  async analyzeExistingDocs(url: string, content?: DocumentationContent): Promise<QualityScore> {
    if (!content || !content.sections || content.sections.length === 0) {
      return {
        overall: 0,
        breakdown: {
          codeExamples: 0,
          readability: 0,
          completeness: 0,
          troubleshooting: 0,
          visualAids: 0,
          seo: 0,
        },
        improvements: [
          'No existing documentation found',
          'Add getting started guide',
          'Include code examples',
          'Create troubleshooting section',
          'Add visual aids (screenshots, diagrams)',
          'Optimize for SEO'
        ],
        strengths: []
      };
    }

    const breakdown = {
      codeExamples: this.scoreCodeExamples(content.sections),
      readability: this.scoreReadability(content.sections),
      completeness: this.scoreCompleteness(content.sections),
      troubleshooting: this.scoreTroubleshooting(content.sections),
      visualAids: this.scoreVisualAids(content.images || []),
      seo: this.scoreSEO(content.metadata || {}),
    };

    const overall = Math.round(
      breakdown.codeExamples * 0.20 +
      breakdown.readability * 0.15 +
      breakdown.completeness * 0.25 +
      breakdown.troubleshooting * 0.15 +
      breakdown.visualAids * 0.10 +
      breakdown.seo * 0.15
    );

    const improvements = this.generateImprovements(breakdown);
    const strengths = this.generateStrengths(breakdown);

    return {
      overall,
      breakdown,
      improvements,
      strengths
    };
  }

  /**
   * Calculate quality score for AI-generated documentation
   */
  async scoreGeneratedDocs(content: DocumentationContent): Promise<QualityScore> {
    const breakdown = {
      codeExamples: this.scoreCodeExamples(content.sections),
      readability: this.scoreReadability(content.sections),
      completeness: this.scoreCompleteness(content.sections),
      troubleshooting: this.scoreTroubleshooting(content.sections),
      visualAids: this.scoreVisualAids(content.images || []),
      seo: this.scoreSEO(content.metadata || {}),
    };

    const overall = Math.round(
      breakdown.codeExamples * 0.20 +
      breakdown.readability * 0.15 +
      breakdown.completeness * 0.25 +
      breakdown.troubleshooting * 0.15 +
      breakdown.visualAids * 0.10 +
      breakdown.seo * 0.15
    );

    const improvements = this.generateImprovements(breakdown);
    const strengths = this.generateStrengths(breakdown);

    return {
      overall,
      breakdown,
      improvements,
      strengths
    };
  }

  private scoreCodeExamples(sections: any[]): number {
    const totalCodeBlocks = sections.reduce((sum, section) => {
      const codeBlocks = section.codeBlocks || [];
      return sum + codeBlocks.length;
    }, 0);

    const hasCodeSection = sections.some(s => 
      s.name?.toLowerCase().includes('code') || 
      s.name?.toLowerCase().includes('example') ||
      s.name?.toLowerCase().includes('tutorial')
    );

    if (totalCodeBlocks === 0) return 0;
    if (totalCodeBlocks < 5) return 30;
    if (totalCodeBlocks < 10) return 60;
    if (totalCodeBlocks >= 10 && hasCodeSection) return 100;
    return 80;
  }

  private scoreReadability(sections: any[]): number {
    const totalWords = sections.reduce((sum, section) => {
      const content = section.content || '';
      return sum + content.split(/\s+/).length;
    }, 0);

    const avgWordsPerSection = totalWords / Math.max(sections.length, 1);
    const hasHeaders = sections.some(s => s.name && s.name.trim().length > 0);
    const hasBulletPoints = sections.some(s => {
      const content = s.content || '';
      return content.includes('- ') || content.includes('* ') || content.includes('•');
    });

    let score = 50; // Base score

    // Good section length (300-1000 words per section is ideal)
    if (avgWordsPerSection >= 300 && avgWordsPerSection <= 1000) {
      score += 20;
    } else if (avgWordsPerSection > 100) {
      score += 10;
    }

    // Has clear headers
    if (hasHeaders) score += 15;

    // Uses bullet points for clarity
    if (hasBulletPoints) score += 15;

    return Math.min(score, 100);
  }

  private scoreCompleteness(sections: any[]): number {
    const essentialSections = [
      'getting started',
      'installation',
      'features',
      'api',
      'tutorial',
      'faq',
      'troubleshooting',
      'best practices'
    ];

    const sectionNames = sections.map(s => (s.name || '').toLowerCase());
    const matchedSections = essentialSections.filter(essential => 
      sectionNames.some(name => name.includes(essential))
    );

    const completenessRatio = matchedSections.length / essentialSections.length;
    
    // Minimum of 5 sections needed
    if (sections.length < 5) return Math.min(completenessRatio * 100, 40);
    
    // 5-7 sections
    if (sections.length < 8) return Math.min(completenessRatio * 100, 70);
    
    // 8+ sections
    return Math.round(completenessRatio * 100);
  }

  private scoreTroubleshooting(sections: any[]): number {
    const hasTroubleshootingSection = sections.some(s => 
      s.name?.toLowerCase().includes('troubleshoot') || 
      s.name?.toLowerCase().includes('common') ||
      s.name?.toLowerCase().includes('problem') ||
      s.name?.toLowerCase().includes('error') ||
      s.name?.toLowerCase().includes('faq')
    );

    if (!hasTroubleshootingSection) return 0;

    const troubleshootingContent = sections
      .filter(s => 
        s.name?.toLowerCase().includes('troubleshoot') || 
        s.name?.toLowerCase().includes('faq') ||
        s.name?.toLowerCase().includes('problem')
      )
      .map(s => s.content || '')
      .join(' ');

    const hasSolutions = troubleshootingContent.toLowerCase().includes('solution') ||
                        troubleshootingContent.toLowerCase().includes('fix') ||
                        troubleshootingContent.toLowerCase().includes('resolve');
    
    const hasQuestions = (troubleshootingContent.match(/\?/g) || []).length >= 3;

    let score = 40; // Base for having the section
    if (hasSolutions) score += 30;
    if (hasQuestions) score += 30;

    return Math.min(score, 100);
  }

  private scoreVisualAids(images: any[]): number {
    if (images.length === 0) return 0;
    if (images.length < 3) return 40;
    if (images.length < 8) return 70;
    return 100;
  }

  private scoreSEO(metadata: any): number {
    let score = 0;

    if (metadata.title && metadata.title.length > 10) score += 40;
    if (metadata.description && metadata.description.length > 50) score += 40;
    if (metadata.keywords || metadata.tags) score += 20;

    return Math.min(score, 100);
  }

  private generateImprovements(breakdown: QualityScore['breakdown']): string[] {
    const improvements: string[] = [];

    if (breakdown.codeExamples < 70) {
      improvements.push('Add more code examples (currently below industry standard)');
    }
    if (breakdown.readability < 70) {
      improvements.push('Improve readability with better formatting and structure');
    }
    if (breakdown.completeness < 70) {
      improvements.push('Add missing essential sections (Getting Started, API Reference, etc.)');
    }
    if (breakdown.troubleshooting < 70) {
      improvements.push('Expand troubleshooting section with common problems and solutions');
    }
    if (breakdown.visualAids < 70) {
      improvements.push('Add more visual aids (screenshots, diagrams, flowcharts)');
    }
    if (breakdown.seo < 70) {
      improvements.push('Optimize metadata for SEO (title, description, keywords)');
    }

    if (improvements.length === 0) {
      improvements.push('Documentation meets high-quality standards');
    }

    return improvements;
  }

  private generateStrengths(breakdown: QualityScore['breakdown']): string[] {
    const strengths: string[] = [];

    if (breakdown.codeExamples >= 80) {
      strengths.push('Excellent code examples');
    }
    if (breakdown.readability >= 80) {
      strengths.push('Highly readable and well-structured');
    }
    if (breakdown.completeness >= 80) {
      strengths.push('Comprehensive coverage of topics');
    }
    if (breakdown.troubleshooting >= 80) {
      strengths.push('Thorough troubleshooting guide');
    }
    if (breakdown.visualAids >= 80) {
      strengths.push('Rich visual content');
    }
    if (breakdown.seo >= 80) {
      strengths.push('Well-optimized for search engines');
    }

    return strengths;
  }
}

// Export singleton instance
export const qualityScoringService = new QualityScoringService();
