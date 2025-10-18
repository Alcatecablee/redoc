import { createAIProvider } from './ai-provider';
import { type ImageMetadata } from './image-utils';

export interface CaptionContext {
  imageUrl: string;
  altText?: string;
  filename?: string;
  sectionTitle?: string;
  nearbyText?: string;
  sourceUrl?: string;
}

/**
 * Generate a caption for an image using AI
 * Limited to 120 characters as per requirements
 */
export async function generateAICaption(
  context: CaptionContext,
  maxLength: number = 120
): Promise<string> {
  const aiProvider = createAIProvider();
  
  // Build a concise prompt
  const prompt = buildCaptionPrompt(context);
  
  try {
    const response = await aiProvider.generateCompletion(
      [
        {
          role: 'system',
          content: `You are a technical documentation expert. Generate clear, concise image captions (maximum ${maxLength} characters). Focus on what the image shows and its relevance to the documentation.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      { timeoutMs: 10000 }
    );
    
    let caption = response.content.trim();
    
    // Remove quotes if present
    caption = caption.replace(/^["']|["']$/g, '');
    
    // Truncate if too long
    if (caption.length > maxLength) {
      caption = caption.substring(0, maxLength - 3) + '...';
    }
    
    // If caption is too short or generic, use fallback
    if (caption.length < 10 || isGenericCaption(caption)) {
      return generateFallbackCaption(context, maxLength);
    }
    
    return caption;
  } catch (error) {
    console.error('AI caption generation failed:', error);
    return generateFallbackCaption(context, maxLength);
  }
}

/**
 * Build a prompt for caption generation
 */
function buildCaptionPrompt(context: CaptionContext): string {
  const parts: string[] = [];
  
  if (context.sectionTitle) {
    parts.push(`Section: "${context.sectionTitle}"`);
  }
  
  if (context.altText) {
    parts.push(`Alt text: "${context.altText}"`);
  }
  
  if (context.filename) {
    const cleanFilename = context.filename
      .replace(/\.[^.]+$/, '')
      .replace(/[-_]/g, ' ');
    parts.push(`Filename: "${cleanFilename}"`);
  }
  
  if (context.nearbyText) {
    const snippet = context.nearbyText.substring(0, 200);
    parts.push(`Context: "${snippet}"`);
  }
  
  parts.push(`Image URL: ${context.imageUrl}`);
  
  return `Generate a concise caption for this documentation image:\n\n${parts.join('\n')}\n\nCaption:`;
}

/**
 * Generate a fallback caption when AI fails or produces poor results
 */
function generateFallbackCaption(context: CaptionContext, maxLength: number): string {
  let caption = context.altText || '';
  
  if (!caption && context.filename) {
    caption = context.filename
      .replace(/\.[^.]+$/, '')
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());
  }
  
  if (!caption && context.sectionTitle) {
    caption = `Image from ${context.sectionTitle}`;
  }
  
  if (!caption) {
    caption = 'Documentation screenshot';
  }
  
  if (caption.length > maxLength) {
    caption = caption.substring(0, maxLength - 3) + '...';
  }
  
  return caption;
}

/**
 * Check if a caption is too generic
 */
function isGenericCaption(caption: string): boolean {
  const generic = [
    'image',
    'screenshot',
    'picture',
    'photo',
    'figure',
    'diagram'
  ];
  
  const lower = caption.toLowerCase();
  return generic.some(word => lower === word || lower === `${word}.`);
}

/**
 * Batch generate captions for multiple images
 */
export async function generateCaptionsForImages(
  images: Array<{ image: ImageMetadata; context: Partial<CaptionContext> }>,
  concurrency: number = 3
): Promise<Map<string, string>> {
  const captions = new Map<string, string>();
  
  async function processImage(item: typeof images[0]): Promise<void> {
    const context: CaptionContext = {
      imageUrl: item.image.url,
      altText: item.image.alt,
      sourceUrl: item.image.sourceUrl,
      ...item.context
    };
    
    // Extract filename from URL
    try {
      const url = new URL(item.image.url);
      context.filename = url.pathname.split('/').pop();
    } catch (error) {
      // Ignore
    }
    
    // Only generate caption if alt text is missing or too short
    if (!context.altText || context.altText.length < 5) {
      const caption = await generateAICaption(context);
      captions.set(item.image.url, caption);
    } else {
      // Use existing alt text, but ensure it's within length limit
      const caption = context.altText.length > 120
        ? context.altText.substring(0, 117) + '...'
        : context.altText;
      captions.set(item.image.url, caption);
    }
  }
  
  // Process in batches with concurrency limit
  for (let i = 0; i < images.length; i += concurrency) {
    const batch = images.slice(i, i + concurrency);
    await Promise.allSettled(
      batch.map(item => processImage(item).catch(error => {
        console.error(`Failed to generate caption for ${item.image.url}:`, error);
      }))
    );
  }
  
  return captions;
}

/**
 * Enhance images with AI-generated captions
 */
export async function enhanceImagesWithCaptions(
  images: ImageMetadata[],
  contextMap: Map<string, Partial<CaptionContext>> = new Map()
): Promise<Array<ImageMetadata & { caption?: string }>> {
  // Prepare batch
  const batch = images.map(image => ({
    image,
    context: contextMap.get(image.url) || {}
  }));
  
  // Generate captions
  const captions = await generateCaptionsForImages(batch);
  
  // Merge captions with images
  return images.map(image => ({
    ...image,
    caption: captions.get(image.url) || image.alt
  }));
}

/**
 * Extract nearby text context from HTML for better caption generation
 */
export function extractNearbyContext(
  imageElement: any,
  maxLength: number = 300
): string {
  // This function would be used with cheerio in the extraction phase
  // to get context around the image for better caption generation
  
  let context = '';
  
  // Try to get text from parent elements
  const parent = imageElement.parent();
  if (parent) {
    const siblings = parent.children();
    const imageIndex = siblings.index(imageElement);
    
    // Get text before image
    const before = siblings.slice(Math.max(0, imageIndex - 2), imageIndex)
      .map((i: any, el: any) => parent.find(el).text().trim())
      .get()
      .join(' ');
    
    // Get text after image
    const after = siblings.slice(imageIndex + 1, imageIndex + 3)
      .map((i: any, el: any) => parent.find(el).text().trim())
      .get()
      .join(' ');
    
    context = `${before} ${after}`.trim();
  }
  
  // Truncate to max length
  if (context.length > maxLength) {
    context = context.substring(0, maxLength);
  }
  
  return context;
}
