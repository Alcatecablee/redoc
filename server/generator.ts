import fetch from 'node-fetch';
import { storage } from './storage';

// Reusable JSON parsing with AI retry (copied/adapted)
export async function parseJSONWithRetry(apiKey: string, content: string, retryPrompt: string, maxRetries = 2): Promise<any> {
  let lastError: Error | null = null;

  try {
    return JSON.parse(content);
  } catch (error) {
    // try to extract JSON from code blocks
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch (e) {
        console.log('Extracted JSON parse failed');
      }
    }

    for (let i = 0; i < maxRetries; i++) {
      try {
        const retryResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: 'You are a JSON formatting expert. Fix the provided content to be valid JSON. Return ONLY valid JSON, no markdown formatting or explanations.' },
              { role: 'user', content: `Fix this JSON:\n\n${content}\n\n${retryPrompt}` }
            ],
            temperature: 0.1,
            response_format: { type: 'json_object' }
          }),
        });

        if (retryResponse.ok) {
          const retryData = await retryResponse.json();
          const fixedContent = retryData.choices?.[0]?.message?.content || '{}';
          return JSON.parse(fixedContent);
        }
      } catch (retryError) {
        lastError = retryError as Error;
        console.log(`Retry ${i + 1} failed:`, retryError);
      }
    }

    throw lastError || new Error('Failed to parse JSON after retries');
  }
}

export async function generateDocumentationPipeline(url: string, userId: string | null) {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY not configured');

  // Fetch website
  const websiteResponse = await fetch(url);
  if (!websiteResponse.ok) throw new Error(`Failed to fetch website: ${websiteResponse.statusText}`);
  const htmlContent = await websiteResponse.text();

  // Extract images
  const imageRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  const images: string[] = [];
  let match;
  while ((match = imageRegex.exec(htmlContent)) !== null) {
    try {
      const absoluteUrl = new URL(match[1], url).href;
      images.push(absoluteUrl);
    } catch {}
  }

  // Extract theme
  const extractTheme = (html: string) => {
    const colors: string[] = [];
    const fonts: string[] = [];
    const hexRegex = /#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})\b/g;
    let hexMatch;
    while ((hexMatch = hexRegex.exec(html)) !== null) colors.push(hexMatch[0]);
    const rgbRegex = /rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[\d.]+\s*)?\)/g;
    let rgbMatch;
    while ((rgbMatch = rgbRegex.exec(html)) !== null) colors.push(rgbMatch[0]);
    const hslRegex = /hsla?\(\s*\d+\s*,\s*[\d.]+%\s*,\s*[\d.]+%\s*(?:,\s*[\d.]+\s*)?\)/g;
    let hslMatch;
    while ((hslMatch = hslRegex.exec(html)) !== null) colors.push(hslMatch[0]);
    const colorPropRegex = /(?:background-color|color|border-color):\s*([^;}"']+)/gi;
    let colorMatch;
    while ((colorMatch = colorPropRegex.exec(html)) !== null) {
      const colorValue = colorMatch[1].trim();
      if (colorValue && !colorValue.includes('var(') && !colorValue.includes('inherit') && !colorValue.includes('transparent')) {
        colors.push(colorValue);
      }
    }
    const cssVarRegex = /--[a-zA-Z0-9-]+:\s*([#a-zA-Z0-9(),.\s%]+);/g;
    let cssVarMatch;
    while ((cssVarMatch = cssVarRegex.exec(html)) !== null) {
      const value = cssVarMatch[1].trim();
      if (value.match(/^#[0-9A-Fa-f]{3,6}$/) || value.match(/^rgb/) || value.match(/^hsl/)) colors.push(value);
    }
    const fontRegex = /font-family:\s*([^;}"']+)/gi;
    let fontMatch;
    while ((fontMatch = fontRegex.exec(html)) !== null) {
      const fontFamily = fontMatch[1].trim().split(',')[0].replace(/['"]/g, '');
      if (fontFamily && !fontFamily.includes('var(') && fontFamily.length < 50) fonts.push(fontFamily);
    }
    const genericFonts = ['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui'];
    const uniqueColors = [...new Set(colors)].filter(c => c && c.length > 0).slice(0, 15);
    const uniqueFonts = [...new Set(fonts)].filter(f => !genericFonts.includes(f.toLowerCase())).slice(0, 8);
    return {
      primaryColor: uniqueColors[0] || '#8B5CF6',
      secondaryColor: uniqueColors[1] || '#6366F1',
      accentColor: uniqueColors[2] || '#8B5CF6',
      colors: uniqueColors,
      fonts: uniqueFonts,
      primaryFont: uniqueFonts[0] || 'Inter, system-ui, sans-serif'
    };
  };

  const theme = extractTheme(htmlContent);

  // Extract text
  const textContent = htmlContent
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 10000);

  // Stage 1: Structure extraction
  const stage1Resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You are an expert content analyzer specializing in extracting structured information from websites to create professional documentation. Return ONLY valid JSON in the specified structure.' },
        { role: 'user', content: `Website URL: ${url}\n\nWebsite Content: ${textContent}\n\nAvailable images: ${images.slice(0,10).join(', ')}` }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    })
  });

  if (!stage1Resp.ok) {
    const text = await stage1Resp.text();
    throw new Error('Structure extraction failed: ' + (stage1Resp.statusText || text));
  }

  const stage1Data = await stage1Resp.json();
  const extractedStructure = await parseJSONWithRetry(GROQ_API_KEY, stage1Data.choices?.[0]?.message?.content || '{}', 'Ensure the output is valid JSON matching the structure extraction format');

  // Stage 2: Write docs
  const stage2Resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You are a professional technical writer. Transform the extracted content structure into professional help center documentation and return structured JSON.' },
        { role: 'user', content: `Source Data (Extracted Structure): ${JSON.stringify(extractedStructure)}` }
      ],
      temperature: 0.4,
      response_format: { type: 'json_object' }
    })
  });

  if (!stage2Resp.ok) {
    const text = await stage2Resp.text();
    throw new Error('Documentation writing failed: ' + (stage2Resp.statusText || text));
  }

  const stage2Data = await stage2Resp.json();
  const writtenDocs = await parseJSONWithRetry(GROQ_API_KEY, stage2Data.choices?.[0]?.message?.content || '{}', 'Ensure the output is valid JSON with proper documentation structure');

  // Stage 3: Metadata
  const stage3Resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You are a documentation engineer preparing content for production deployment in a professional help center. Return ONLY valid JSON.' },
        { role: 'user', content: `Documentation to enhance: ${JSON.stringify(writtenDocs)}\n\nSource URL: ${url}` }
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    })
  });

  if (!stage3Resp.ok) {
    const text = await stage3Resp.text();
    throw new Error('Metadata generation failed: ' + (stage3Resp.statusText || text));
  }

  const stage3Data = await stage3Resp.json();
  const finalMetadata = await parseJSONWithRetry(GROQ_API_KEY, stage3Data.choices?.[0]?.message?.content || '{}', 'Ensure the output is valid JSON with metadata and searchability fields');

  // Stage 4: Validation
  const documentationForValidation = {
    title: finalMetadata.metadata?.title || writtenDocs.title || 'Documentation',
    description: finalMetadata.metadata?.description || writtenDocs.description || '',
    sections: finalMetadata.enhanced_sections && finalMetadata.enhanced_sections.length > 0 ? finalMetadata.enhanced_sections : writtenDocs.sections || [],
    metadata: finalMetadata.metadata || {},
  };

  const stage4Resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You are a quality assurance specialist for technical documentation. Return JSON with validation and refined sections.' },
        { role: 'user', content: `Documentation to validate: ${JSON.stringify(documentationForValidation)}` }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    })
  });

  let validationResults = null;
  let refinedSections = documentationForValidation.sections;

  if (stage4Resp.ok) {
    const stage4Data = await stage4Resp.json();
    const validationData = await parseJSONWithRetry(GROQ_API_KEY, stage4Data.choices?.[0]?.message?.content || '{}', 'Ensure the output is valid JSON with validation results and refined sections');
    validationResults = validationData.validation_results;
    if (validationData.refined_sections && validationData.refined_sections.length > 0 && validationResults?.overall_score < 85) {
      refinedSections = validationData.refined_sections;
    }
  }

  // Final doc
  const finalDoc = {
    title: documentationForValidation.title,
    description: documentationForValidation.description,
    sections: refinedSections,
    metadata: finalMetadata.metadata || {},
    searchability: finalMetadata.searchability || {},
    validation: validationResults,
    theme: theme,
    extractedStructure: extractedStructure
  };

  // Save to DB
  const documentation = await storage.createDocumentation({
    url,
    title: finalDoc.title,
    content: JSON.stringify(finalDoc),
    user_id: userId,
  } as any);

  return { documentation, finalDoc };
}
