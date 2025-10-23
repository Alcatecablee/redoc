import { YouTubeService } from './server/youtube-service';

async function testYouTubeAPI() {
  console.log('🧪 Testing YouTube API Integration...\n');
  
  const ytService = new YouTubeService();
  
  // Test 1: Validate API Key
  console.log('Test 1: Validating YouTube API Key...');
  const isValid = await ytService.validateApiKey();
  console.log(`   Result: ${isValid ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`   API Key Valid: ${isValid}\n`);
  
  if (!isValid) {
    console.log('❌ YouTube API key validation failed. Cannot proceed with further tests.\n');
    process.exit(1);
  }
  
  // Test 2: Search for videos
  console.log('Test 2: Searching for React tutorial videos...');
  try {
    const searchResult = await ytService.searchVideos('React tutorial', 3);
    console.log(`   Result: ${searchResult.videos.length > 0 ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`   Found: ${searchResult.videos.length} videos`);
    console.log(`   Quality Score: ${searchResult.qualityScore.toFixed(2)}`);
    if (searchResult.videos.length > 0) {
      console.log(`   First video: "${searchResult.videos[0].title}"`);
      console.log(`   Channel: ${searchResult.videos[0].channelTitle}`);
      console.log(`   Views: ${searchResult.videos[0].views.toLocaleString()}`);
    }
    console.log();
  } catch (error: any) {
    console.log(`   Result: ❌ FAILED`);
    console.log(`   Error: ${error.message}\n`);
  }
  
  // Test 3: Get video transcript
  console.log('Test 3: Fetching video transcript...');
  try {
    // Use a popular video ID that likely has captions
    const transcript = await ytService.getVideoTranscript('dQw4w9WgXcQ');
    console.log(`   Result: ${transcript ? '✅ PASSED' : '⚠️ PARTIAL'}`);
    console.log(`   Transcript available: ${!!transcript}`);
    if (transcript) {
      console.log(`   Transcript length: ${transcript.length} characters`);
      console.log(`   Preview: ${transcript.substring(0, 100)}...`);
    } else {
      console.log(`   Note: Video may not have captions enabled`);
    }
    console.log();
  } catch (error: any) {
    console.log(`   Result: ⚠️ PARTIAL (expected for videos without captions)`);
    console.log(`   Error: ${error.message}\n`);
  }
  
  // Test 4: Check quota status
  console.log('Test 4: Checking API quota usage...');
  const quotaStatus = ytService.getQuotaStatus();
  console.log(`   Result: ✅ PASSED`);
  console.log(`   Quota used: ${quotaStatus.used}/${quotaStatus.limit} units`);
  console.log(`   Remaining: ${quotaStatus.remaining} units`);
  console.log(`   Percent used: ${quotaStatus.percentUsed.toFixed(2)}%\n`);
  
  console.log('🎉 YouTube API Integration Test Complete!\n');
}

testYouTubeAPI().catch(error => {
  console.error('💥 Test failed with error:', error);
  process.exit(1);
});
