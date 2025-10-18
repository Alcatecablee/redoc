/**
 * Test script for Search API integration
 * 
 * This script tests both SerpAPI and Brave Search API to verify they're working correctly.
 * Run with: node test-search-api.js
 */

import fetch from 'node-fetch';
import { config } from 'dotenv';

// Load environment variables
config();

const SERPAPI_KEY = process.env.SERPAPI_KEY;
const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

console.log('🧪 Testing Search API Integration\n');

// Test SerpAPI
async function testSerpAPI() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Testing SerpAPI (Primary Search Provider)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (!SERPAPI_KEY) {
    console.log('⚠️  SERPAPI_KEY not configured in .env');
    console.log('   Add: SERPAPI_KEY=your_key_here\n');
    return false;
  }

  try {
    console.log('🔍 Searching: "supabase documentation"...\n');
    
    const url = new URL('https://serpapi.com/search');
    url.searchParams.append('api_key', SERPAPI_KEY);
    url.searchParams.append('q', 'supabase documentation');
    url.searchParams.append('num', '5');
    url.searchParams.append('engine', 'google');

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      const text = await response.text();
      console.log(`❌ SerpAPI failed: ${response.status} ${response.statusText}`);
      console.log(`   Response: ${text}\n`);
      return false;
    }

    const data = await response.json();

    if (!data.organic_results || data.organic_results.length === 0) {
      console.log('⚠️  No organic results returned\n');
      return false;
    }

    console.log(`✅ SerpAPI is working! Found ${data.organic_results.length} results:\n`);
    
    data.organic_results.slice(0, 3).forEach((result, i) => {
      console.log(`   ${i + 1}. ${result.title}`);
      console.log(`      ${result.link}`);
      console.log(`      ${result.snippet?.substring(0, 80)}...\n`);
    });

    console.log('✅ SerpAPI Test: PASSED\n');
    return true;

  } catch (error) {
    console.log(`❌ SerpAPI test error: ${error.message}\n`);
    return false;
  }
}

// Test Brave Search API
async function testBraveSearch() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Testing Brave Search API (Fallback Provider)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (!BRAVE_API_KEY) {
    console.log('⚠️  BRAVE_API_KEY not configured in .env');
    console.log('   Add: BRAVE_API_KEY=your_key_here\n');
    return false;
  }

  try {
    console.log('🔍 Searching: "supabase documentation"...\n');
    
    const url = new URL('https://api.search.brave.com/res/v1/web/search');
    url.searchParams.append('q', 'supabase documentation');
    url.searchParams.append('count', '5');

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': BRAVE_API_KEY
      }
    });

    if (!response.ok) {
      const text = await response.text();
      console.log(`❌ Brave Search failed: ${response.status} ${response.statusText}`);
      console.log(`   Response: ${text}\n`);
      return false;
    }

    const data = await response.json();

    if (!data.web || !data.web.results || data.web.results.length === 0) {
      console.log('⚠️  No web results returned\n');
      return false;
    }

    console.log(`✅ Brave Search is working! Found ${data.web.results.length} results:\n`);
    
    data.web.results.slice(0, 3).forEach((result, i) => {
      console.log(`   ${i + 1}. ${result.title}`);
      console.log(`      ${result.url}`);
      console.log(`      ${result.description?.substring(0, 80)}...\n`);
    });

    console.log('✅ Brave Search Test: PASSED\n');
    return true;

  } catch (error) {
    console.log(`❌ Brave Search test error: ${error.message}\n`);
    return false;
  }
}

// Test Stack Overflow scraping
async function testStackOverflow() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Testing Stack Overflow Extraction');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const testUrl = 'https://stackoverflow.com/questions/70413573/what-is-supabase-and-how-to-use-it';
    console.log(`🔍 Testing SO extraction from: ${testUrl}\n`);
    
    const response = await fetch(testUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      console.log(`⚠️  Stack Overflow request failed: ${response.status}\n`);
      return false;
    }

    console.log('✅ Stack Overflow is accessible');
    console.log('   (Full extraction tested in main application)\n');
    return true;

  } catch (error) {
    console.log(`❌ Stack Overflow test error: ${error.message}\n`);
    return false;
  }
}

// Test YouTube API
async function testYouTubeAPI() {
  if (!YOUTUBE_API_KEY) {
    console.log('❌ YouTube API: No API key configured');
    return false;
  }

  try {
    const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=react+tutorial&maxResults=5&type=video&key=${YOUTUBE_API_KEY}`);
    const data = await response.json();
    
    if (data.items && data.items.length > 0) {
      console.log(`✅ YouTube API: Working (${data.items.length} videos found)`);
      return true;
    } else {
      console.log('❌ YouTube API: No results returned');
      return false;
    }
  } catch (error) {
    console.log('❌ YouTube API: Error -', error.message);
    return false;
  }
}

// Test GitHub API
async function testGitHub() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Testing GitHub API Access');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const testUrl = 'https://api.github.com/repos/supabase/supabase/issues/1';
    console.log(`🔍 Testing GitHub API: ${testUrl}\n`);
    
    const response = await fetch(testUrl, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'AI-Knowledge-Base-Generator'
      }
    });

    if (!response.ok) {
      console.log(`⚠️  GitHub API request failed: ${response.status}\n`);
      return false;
    }

    const data = await response.json();

    console.log('✅ GitHub API is accessible');
    console.log(`   Sample issue: "${data.title}"`);
    console.log(`   State: ${data.state}, Comments: ${data.comments}\n`);
    return true;

  } catch (error) {
    console.log(`❌ GitHub test error: ${error.message}\n`);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('Starting API integration tests...\n');
  
  const serpApiResult = await testSerpAPI();
  const braveResult = await testBraveSearch();
  const youtubeResult = await testYouTubeAPI();
  const soResult = await testStackOverflow();
  const githubResult = await testGitHub();

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test Results Summary');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log(`SerpAPI (Primary):          ${serpApiResult ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Brave Search (Fallback):    ${braveResult ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`YouTube API:                ${youtubeResult ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Stack Overflow Scraping:    ${soResult ? '✅ PASS' : '⚠️  LIMITED'}`);
  console.log(`GitHub API:                 ${githubResult ? '✅ PASS' : '⚠️  LIMITED'}`);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (!serpApiResult && !braveResult) {
    console.log('⚠️  WARNING: No search APIs are configured!');
    console.log('   Documentation generation will be limited to site content only.');
    console.log('   Configure at least one search API in .env for comprehensive docs.\n');
  } else if (serpApiResult) {
    console.log('✅ Excellent! SerpAPI is working. You\'ll get the best quality results.');
  } else if (braveResult) {
    console.log('✅ Good! Brave Search is working. This provides solid quality results.');
  }

  if (youtubeResult) {
    console.log('🎥 YouTube API is working! Pro/Enterprise users will get rich video metadata.');
  } else {
    console.log('⚠️  YouTube API not configured. Video features will be limited to basic search.');
  }

  console.log('\n📚 To generate comprehensive documentation, run:');
  console.log('   npm run dev');
  console.log('   Then visit http://localhost:5000 and paste a URL\n');

  console.log('💡 For more details, see:');
  console.log('   - SEARCH_INTEGRATION.md (API setup guide)');
  console.log('   - YOUTUBE_API_SETUP.md (YouTube API setup)');
  console.log('   - README.md (complete documentation)\n');
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
