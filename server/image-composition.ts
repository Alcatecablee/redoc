import { type ImageMetadata } from './image-utils';

export interface EnhancedImage extends ImageMetadata {
  caption?: string;
  section?: string;
  confidence?: number;
}

export interface DocumentSection {
  title: string;
  content: string;
  blocks?: any[];
  headingLevel?: number;
  id?: string;
}

export interface ImagePlacement {
  image: EnhancedImage;
  sectionId: string;
  sectionTitle: string;
  position: 'top' | 'middle' | 'bottom';
  confidence: number;
}

/**
 * Calculate relevance score between an image and a section
 * based on alt text, caption, and section content
 */
export function calculateRelevanceScore(
  image: EnhancedImage,
  section: DocumentSection
): number {
  let score = 0;
  
  const imageText = `${image.alt} ${image.caption || ''}`.toLowerCase();
  const sectionText = `${section.title} ${section.content}`.toLowerCase();
  
  // Extract keywords from image text
  const imageWords = imageText.split(/\s+/).filter(w => w.length > 3);
  const sectionWords = new Set(sectionText.split(/\s+/));
  
  // Calculate word overlap
  let matchCount = 0;
  for (const word of imageWords) {
    if (sectionWords.has(word)) {
      matchCount++;
    }
  }
  
  if (imageWords.length > 0) {
    score = matchCount / imageWords.length;
  }
  
  // Boost score if image importance is high and section is near the top
  if (image.importance === 'high') {
    score *= 1.3;
  }
  
  // Boost for specific keywords that indicate visual content
  const visualKeywords = [
    'screenshot', 'diagram', 'architecture', 'dashboard',
    'interface', 'ui', 'example', 'visual', 'image',
    'chart', 'graph', 'illustration'
  ];
  
  for (const keyword of visualKeywords) {
    if (imageText.includes(keyword) || sectionText.includes(keyword)) {
      score += 0.15;
    }
  }
  
  // Cap score at 1.0
  return Math.min(score, 1.0);
}

/**
 * Find the best placement for each image in the documentation
 */
export function findImagePlacements(
  images: EnhancedImage[],
  sections: DocumentSection[]
): {
  placements: ImagePlacement[];
  unplacedImages: EnhancedImage[];
} {
  const placements: ImagePlacement[] = [];
  const unplacedImages: EnhancedImage[] = [];
  
  // Minimum confidence threshold for automatic placement
  const CONFIDENCE_THRESHOLD = 0.2;
  
  for (const image of images) {
    let bestPlacement: ImagePlacement | null = null;
    let bestScore = 0;
    
    // Try to find the best matching section
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const score = calculateRelevanceScore(image, section);
      
      if (score > bestScore) {
        bestScore = score;
        bestPlacement = {
          image,
          sectionId: section.id || `section-${i}`,
          sectionTitle: section.title,
          position: determinePosition(score, section),
          confidence: score
        };
      }
    }
    
    // Place image if confidence is above threshold
    if (bestPlacement && bestScore >= CONFIDENCE_THRESHOLD) {
      placements.push(bestPlacement);
    } else {
      unplacedImages.push(image);
    }
  }
  
  return { placements, unplacedImages };
}

/**
 * Determine the best position within a section for an image
 */
function determinePosition(
  score: number,
  section: DocumentSection
): 'top' | 'middle' | 'bottom' {
  // High confidence: place at top
  if (score >= 0.6) {
    return 'top';
  }
  
  // Medium confidence: place in middle
  if (score >= 0.3) {
    return 'middle';
  }
  
  // Low confidence: place at bottom
  return 'bottom';
}

/**
 * Insert images into sections based on placements
 */
export function insertImagesIntoSections(
  sections: DocumentSection[],
  placements: ImagePlacement[]
): DocumentSection[] {
  const updatedSections = sections.map(section => ({ ...section }));
  
  // Group placements by section
  const placementsBySection = new Map<string, ImagePlacement[]>();
  for (const placement of placements) {
    const existing = placementsBySection.get(placement.sectionId) || [];
    existing.push(placement);
    placementsBySection.set(placement.sectionId, existing);
  }
  
  // Insert images into sections
  for (let i = 0; i < updatedSections.length; i++) {
    const section = updatedSections[i];
    const sectionId = section.id || `section-${i}`;
    const sectionPlacements = placementsBySection.get(sectionId) || [];
    
    if (sectionPlacements.length === 0) continue;
    
    // Ensure blocks array exists
    if (!section.blocks) {
      section.blocks = [];
    }
    
    // Sort placements by confidence and position
    const sorted = sectionPlacements.sort((a, b) => {
      const posOrder = { top: 0, middle: 1, bottom: 2 };
      const posCompare = posOrder[a.position] - posOrder[b.position];
      if (posCompare !== 0) return posCompare;
      return b.confidence - a.confidence;
    });
    
    // Insert images at appropriate positions
    for (const placement of sorted) {
      const imageBlock = {
        type: 'image',
        url: placement.image.url,
        alt: placement.image.alt,
        caption: placement.image.caption,
        width: placement.image.width,
        height: placement.image.height,
        source: placement.image.sourceUrl,
        importance: placement.image.importance
      };
      
      // Insert based on position
      if (placement.position === 'top') {
        section.blocks.unshift(imageBlock);
      } else if (placement.position === 'bottom') {
        section.blocks.push(imageBlock);
      } else {
        // Insert in middle
        const middleIndex = Math.floor(section.blocks.length / 2);
        section.blocks.splice(middleIndex, 0, imageBlock);
      }
    }
  }
  
  return updatedSections;
}

/**
 * Create a "Screenshots" appendix section for unplaced images
 */
export function createScreenshotsAppendix(
  unplacedImages: EnhancedImage[]
): DocumentSection | null {
  if (unplacedImages.length === 0) {
    return null;
  }
  
  const blocks = [];
  
  // Add intro paragraph
  blocks.push({
    type: 'paragraph',
    content: 'This section contains additional screenshots and visual content from the documentation.'
  });
  
  // Add each image
  for (const image of unplacedImages) {
    blocks.push({
      type: 'image',
      url: image.url,
      alt: image.alt,
      caption: image.caption || image.alt,
      width: image.width,
      height: image.height,
      source: image.sourceUrl,
      importance: image.importance
    });
    
    // Add spacing between images
    blocks.push({
      type: 'spacer'
    });
  }
  
  return {
    id: 'screenshots-appendix',
    title: 'Screenshots',
    content: 'Additional visual content and screenshots',
    headingLevel: 2,
    blocks
  };
}

/**
 * Add source attribution to images
 */
export function addSourceAttribution(
  image: EnhancedImage,
  includeLink: boolean = true
): string {
  if (!image.sourceUrl) {
    return '';
  }
  
  try {
    const sourceUrl = new URL(image.sourceUrl);
    const domain = sourceUrl.hostname.replace(/^www\./, '');
    
    if (includeLink) {
      return `Source: [${domain}](${image.sourceUrl})`;
    }
    
    return `Source: ${domain}`;
  } catch (error) {
    return '';
  }
}

/**
 * Main function to compose images into documentation
 */
export function composeImagesIntoDocumentation(
  sections: DocumentSection[],
  images: EnhancedImage[]
): {
  sections: DocumentSection[];
  stats: {
    totalImages: number;
    placedImages: number;
    unplacedImages: number;
    averageConfidence: number;
  };
} {
  // Find placements for all images
  const { placements, unplacedImages } = findImagePlacements(images, sections);
  
  // Insert images into sections
  let updatedSections = insertImagesIntoSections(sections, placements);
  
  // Create appendix for unplaced images
  const appendix = createScreenshotsAppendix(unplacedImages);
  if (appendix) {
    updatedSections.push(appendix);
  }
  
  // Calculate stats
  const averageConfidence = placements.length > 0
    ? placements.reduce((sum, p) => sum + p.confidence, 0) / placements.length
    : 0;
  
  return {
    sections: updatedSections,
    stats: {
      totalImages: images.length,
      placedImages: placements.length,
      unplacedImages: unplacedImages.length,
      averageConfidence
    }
  };
}

/**
 * Filter images by importance threshold
 */
export function filterImagesByImportance(
  images: EnhancedImage[],
  minImportance: 'high' | 'medium' | 'low' = 'medium'
): EnhancedImage[] {
  const importanceOrder = { high: 3, medium: 2, low: 1 };
  const threshold = importanceOrder[minImportance];
  
  return images.filter(img => {
    const imgImportance = importanceOrder[img.importance || 'low'];
    return imgImportance >= threshold;
  });
}

/**
 * Limit total number of images in documentation
 */
export function limitTotalImages(
  images: EnhancedImage[],
  maxImages: number
): EnhancedImage[] {
  if (images.length <= maxImages) {
    return images;
  }
  
  // Sort by importance and keep top N
  const sorted = [...images].sort((a, b) => {
    const importanceOrder = { high: 3, medium: 2, low: 1 };
    const aScore = importanceOrder[a.importance || 'low'];
    const bScore = importanceOrder[b.importance || 'low'];
    return bScore - aScore;
  });
  
  return sorted.slice(0, maxImages);
}
