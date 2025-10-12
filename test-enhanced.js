import fetch from 'node-fetch';

async function testEnhancedSystem() {
  console.log('Testing Enhanced Documentation Generation System...\n');
  
  const testUrls = [
    'https://taxfy.co.za/',
    'https://supabase.com/'
  ];
  
  for (const url of testUrls) {
    console.log(`\n=== Testing: ${url} ===`);
    
    try {
      const response = await fetch('http://localhost:3001/api/generate-docs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url,
          userId: 'test-user'
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Success!');
        console.log('Documentation ID:', result.documentationId);
        console.log('Status:', result.status);
        
        if (result.documentationId) {
          // Fetch the generated documentation
          const docResponse = await fetch(`http://localhost:3001/api/documentation/${result.documentationId}`);
          if (docResponse.ok) {
            const doc = await docResponse.json();
            console.log('📄 Generated Documentation:');
            console.log('Title:', doc.title);
            console.log('Sections:', doc.sections?.length || 0);
            console.log('Research Stats:', doc.researchStats);
            console.log('Theme:', doc.theme);
          }
        }
      } else {
        const error = await response.text();
        console.log('❌ Error:', response.status, error);
      }
    } catch (error) {
      console.log('❌ Request failed:', error.message);
    }
    
    console.log('\n' + '='.repeat(50));
  }
}

// Wait a bit for server to start, then test
setTimeout(() => {
  testEnhancedSystem().catch(console.error);
}, 5000);