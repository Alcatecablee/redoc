import fetch from 'node-fetch';

async function testEnhancedSystem() {
  console.log('Testing Enhanced Documentation Generation System...\n');
  
  // Test the enhanced generator directly
  const { generateEnhancedDocumentation } = await import('./server/enhanced-generator.ts');
  
  const testUrls = [
    'https://taxfy.co.za/',
    'https://supabase.com/'
  ];
  
  for (const url of testUrls) {
    console.log(`\n=== Testing: ${url} ===`);
    
    try {
      console.log('Starting enhanced documentation generation...');
      const result = await generateEnhancedDocumentation(url, 'test-user');
      
      console.log('✅ Success!');
      console.log('Documentation ID:', result.documentation.id);
      console.log('Title:', result.finalDoc.title);
      console.log('Sections:', result.finalDoc.sections?.length || 0);
      console.log('Research Stats:', result.finalDoc.researchStats);
      console.log('Theme:', result.finalDoc.theme);
      
      if (result.finalDoc.sections && result.finalDoc.sections.length > 0) {
        console.log('\n📄 Sample Section:');
        const firstSection = result.finalDoc.sections[0];
        console.log(`- ${firstSection.title}`);
        console.log(`- Content blocks: ${firstSection.content?.length || 0}`);
      }
      
    } catch (error) {
      console.log('❌ Error:', error.message);
      console.log('Stack:', error.stack);
    }
    
    console.log('\n' + '='.repeat(50));
  }
}

// Run the test
testEnhancedSystem().catch(console.error);