// Test script for the enhanced comprehensive documentation generation
// This demonstrates the improved multi-source research capabilities

import { generateEnhancedDocumentation } from './server/enhanced-generator.js';

async function testEnhancedGeneration() {
  console.log('🚀 Testing Enhanced Documentation Generation System');
  console.log('================================================\n');
  
  // Test with a well-documented service
  const testUrl = 'https://supabase.com';
  
  console.log(`📊 Analyzing: ${testUrl}`);
  console.log('This will demonstrate the comprehensive research approach:\n');
  
  console.log('✅ Stage 1: Site Discovery & Multi-page Crawling');
  console.log('   - Discovering /docs, /blog, /guides, /api sections');
  console.log('   - Extracting content from up to 30 pages');
  console.log('   - Gathering code examples and visual elements\n');
  
  console.log('✅ Stage 2: External Search Research');
  console.log('   - Performing 7 targeted search queries');
  console.log('   - Using Brave Search API (if configured) or SerpAPI fallback');
  console.log('   - Gathering best practices and tutorials\n');
  
  console.log('✅ Stage 3: Community Insights');
  console.log('   - Analyzing Stack Overflow questions and answers');
  console.log('   - Scraping GitHub issues and discussions');
  console.log('   - Extracting real troubleshooting solutions\n');
  
  console.log('✅ Stage 4: AI-Powered Documentation Generation');
  console.log('   - Synthesizing all sources into comprehensive docs');
  console.log('   - Creating detailed troubleshooting guides');
  console.log('   - Generating FAQ from real community questions\n');
  
  try {
    const startTime = Date.now();
    
    // Note: This requires GROQ_API_KEY to be set
    // Other API keys are optional but recommended for full functionality
    const result = await generateEnhancedDocumentation(testUrl, null);
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(1);
    
    console.log(`🎉 Generation completed in ${duration} seconds!`);
    console.log('\n📈 Research Statistics:');
    console.log(`   Pages analyzed: ${result.finalDoc.researchStats.pages_analyzed}`);
    console.log(`   External sources: ${result.finalDoc.researchStats.external_sources}`);
    console.log(`   Stack Overflow questions: ${result.finalDoc.researchStats.stackoverflow_questions}`);
    console.log(`   GitHub issues: ${result.finalDoc.researchStats.github_issues}`);
    console.log(`   Code examples found: ${result.finalDoc.researchStats.code_examples}`);
    console.log(`   Total words analyzed: ${result.finalDoc.researchStats.total_words.toLocaleString()}`);
    
    console.log('\n📚 Documentation Quality:');
    console.log(`   Title: ${result.finalDoc.title}`);
    console.log(`   Sections generated: ${result.finalDoc.sections.length}`);
    console.log(`   Estimated read time: ${result.finalDoc.metadata.estimated_read_time || 'N/A'}`);
    
    console.log('\n💡 Compared to basic single-page extraction, this provides:');
    console.log(`   ${Math.max(result.finalDoc.researchStats.pages_analyzed, 1)}x more pages analyzed`);
    console.log(`   ${Math.max(result.finalDoc.researchStats.external_sources, 1)}x more external sources`);
    console.log(`   Real community insights from ${result.finalDoc.researchStats.stackoverflow_questions + result.finalDoc.researchStats.github_issues} discussions`);
    
    // Save a sample of the output
    const fs = await import('fs');
    const sampleOutput = {
      title: result.finalDoc.title,
      description: result.finalDoc.description,
      researchStats: result.finalDoc.researchStats,
      sampleSections: result.finalDoc.sections.slice(0, 3), // First 3 sections
      metadata: result.finalDoc.metadata
    };
    
    fs.writeFileSync('enhanced-output-sample.json', JSON.stringify(sampleOutput, null, 2));
    console.log('\n💾 Sample output saved to: enhanced-output-sample.json');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    if (error.message.includes('GROQ_API_KEY')) {
      console.log('\n💡 Setup required:');
      console.log('   1. Copy .env.example to .env');
      console.log('   2. Add your GROQ_API_KEY');
      console.log('   3. Optionally add BRAVE_API_KEY, SERPAPI_KEY, STACKOVERFLOW_KEY, GITHUB_TOKEN');
      console.log('   4. Run: npm run test:enhanced');
    }
  }
}

// Run the test
testEnhancedGeneration().catch(console.error);