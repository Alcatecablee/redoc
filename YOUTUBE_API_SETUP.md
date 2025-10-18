# YouTube API Integration Setup

## Environment Variables

Add the following environment variable to your `.env` file:

```bash
# YouTube Data API v3 Key
YOUTUBE_API_KEY=your_youtube_api_key_here
```

## Getting a YouTube API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **YouTube Data API v3**
4. Create credentials (API Key)
5. Copy the API key to your `.env` file

## API Quotas

- **Free Tier**: 10,000 units per day
- **Cost**: $0.10 per 1,000 units after free tier
- **Typical Usage**: ~100 units per documentation generation

## Features by Tier

### Free Tier
- ✅ Basic YouTube search (via SerpAPI/Brave)
- ❌ YouTube API access
- ❌ Video transcripts

### Pro Tier ($19/month)
- ✅ Basic YouTube search
- ✅ YouTube API access (metadata, views, comments)
- ❌ Video transcripts

### Enterprise Tier ($99/month)
- ✅ Basic YouTube search
- ✅ YouTube API access
- ✅ Video transcripts and summaries

## Testing

Run the search API test to verify YouTube integration:

```bash
npm run test:search
```

This will test:
- SerpAPI integration (includes YouTube search)
- Brave Search integration
- YouTube API access (if configured)
- Stack Overflow scraping
- GitHub API access
