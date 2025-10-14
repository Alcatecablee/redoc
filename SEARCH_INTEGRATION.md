# Search API Integration Guide

## Overview

This application uses **SerpAPI** as the primary search provider with **Brave Search API** as a fallback to perform comprehensive external research when generating documentation. This enables the system to find common issues, troubleshooting solutions, Stack Overflow answers, and GitHub discussions related to the product.

## Why Two Search APIs?

- **SerpAPI (Primary)**: Provides actual Google search results with rich snippets, Stack Overflow answers, and GitHub content. Best quality but paid.
- **Brave Search API (Fallback)**: Free tier available (2,000 queries/month), good quality results, automatically used if SerpAPI is not configured or fails.

## Setup Instructions

### Option 1: SerpAPI (Recommended for Best Results)

1. **Sign up for SerpAPI**
   - Visit: https://serpapi.com/
   - Create an account
   - Get your API key from the dashboard

2. **Pricing**
   - Free trial available (100 searches)
   - Developer plan: $50/month for 5,000 searches
   - Production plan: $130/month for 15,000 searches

3. **Add to .env**
   ```bash
   SERPAPI_KEY=your_serpapi_key_here
   ```

### Option 2: Brave Search API (Free Alternative)

1. **Sign up for Brave Search API**
   - Visit: https://brave.com/search/api/
   - Request API access
   - Get your subscription token

2. **Pricing**
   - Free tier: 2,000 queries/month (Rate limited to 1 query/second)
   - Pro tier: $3 per 1,000 queries beyond free tier

3. **Add to .env**
   ```bash
   BRAVE_API_KEY=your_brave_subscription_token_here
   ```

### Option 3: Both APIs (Best Redundancy)

Configure both for maximum reliability:

```bash
# Primary provider
SERPAPI_KEY=your_serpapi_key_here

# Fallback provider
BRAVE_API_KEY=your_brave_api_key_here
```

## How It Works

### Search Flow

1. **Primary**: Attempts SerpAPI if `SERPAPI_KEY` is configured
2. **Fallback**: Falls back to Brave Search if SerpAPI fails or is not configured
3. **Graceful Degradation**: Returns empty results if both fail, allowing basic documentation generation

### Comprehensive Research Process

When you generate documentation for a URL like `https://supabase.com`:

1. **Site Discovery** (Stage 1)
   - Crawls the main site for documentation pages
   - Extracts content from `/docs`, `/blog`, `/api`, etc.

2. **Multi-Page Extraction** (Stage 2)
   - Scrapes up to 30 relevant pages
   - Extracts code examples, screenshots, headings

3. **External Research** (Stage 3) - **This is where search APIs are used**
   - Performs 8 targeted searches:
     - `"supabase" documentation site:supabase.com`
     - `"supabase" tutorial getting started -site:supabase.com`
     - `"supabase" error troubleshooting site:stackoverflow.com`
     - `"supabase" issues site:github.com`
     - `"supabase" best practices tips`
     - `"supabase" vs alternatives comparison`
     - `"supabase" integration guide`
     - `"supabase" API examples code`

4. **Stack Overflow Extraction** (Stage 3b)
   - Finds top Stack Overflow questions
   - Extracts accepted answers and high-vote answers
   - Includes code examples and solutions

5. **GitHub Issues Extraction** (Stage 3c)
   - Finds relevant GitHub issues and discussions
   - Extracts common problems and workarounds
   - Includes issue labels and status

6. **AI Synthesis** (Stage 4)
   - Combines all data (site content + external research)
   - Generates comprehensive documentation
   - Includes troubleshooting based on real issues

## Search Results Quality

The system calculates a quality score based on:

- **Stack Overflow results**: 2x weight (high-quality technical content)
- **GitHub results**: 2x weight (real issues and solutions)
- **Official documentation**: 3x weight (authoritative)
- **Blog posts**: 1x weight (tutorials and guides)
- **Other sources**: 0.5x weight

**Quality Score Scale**:
- 90-100%: Excellent - Found comprehensive multi-source research
- 70-89%: Good - Found solid external research
- 50-69%: Fair - Found some external sources
- Below 50%: Limited - Mostly relying on site content

## Example Output

With proper search API configuration, for `https://taxfy.co.za`, the system will:

✅ Find 30-40 search results from various sources  
✅ Extract 3-5 Stack Overflow answers with solutions  
✅ Extract 3-5 GitHub issues with known problems  
✅ Generate comprehensive troubleshooting section  
✅ Include real-world use cases from tutorials  
✅ Add FAQ based on common questions found online  

## Rate Limiting

The system implements automatic rate limiting:

- **SerpAPI**: 1 second delay between requests
- **Brave Search**: 1 second delay between requests
- **Stack Overflow scraping**: 2 second delay between requests
- **GitHub API**: 1 second delay between requests

This prevents hitting API rate limits and being blocked.

## Error Handling

The system gracefully handles:

- ❌ API key not configured → Falls back to next provider
- ❌ API request fails → Logs error, continues with available data
- ❌ Rate limit exceeded → Logs warning, uses partial results
- ❌ No search results found → Generates documentation from site content only

## Testing Without API Keys

If you want to test the system without configuring search APIs:

1. The system will still work but will only use content from the target website
2. You'll see console messages: `"No search API keys configured"`
3. Documentation will be generated but will lack:
   - External tutorials and guides
   - Stack Overflow solutions
   - GitHub issue insights
   - Community best practices

## Cost Estimation

### For Typical Usage (10 documentations/day):

**SerpAPI**:
- 10 docs × 8 queries = 80 searches/day
- 80 × 30 days = 2,400 searches/month
- Cost: ~$25/month (within 5,000 search tier)

**Brave Search**:
- Same usage = 2,400 queries/month
- Cost: $1.20/month (400 queries beyond free tier)

**Recommendation**: Start with Brave Search free tier, upgrade to SerpAPI if you need higher quality results.

## Monitoring

The system logs comprehensive research statistics:

```bash
🔍 Searching with SerpAPI: "supabase documentation"
✅ Research complete:
    - Search results: 35
    - Stack Overflow answers: 4
    - GitHub issues: 3
📊 Research quality score: 87.5%
```

## Troubleshooting

### "No search API keys configured"

**Solution**: Add at least one API key to your `.env` file

### "SerpAPI request failed: 401"

**Solution**: Check your API key is correct and active

### "Brave Search request failed: 429"

**Solution**: You've hit rate limits. Wait or upgrade plan.

### Results seem low quality

**Solution**: 
1. Ensure SerpAPI is configured (better than Brave)
2. Check the quality score in logs
3. Verify the product name is being extracted correctly

## Advanced Configuration

### Custom Search Queries

You can modify search queries in `server/search-service.ts`:

```typescript
const queries = [
  // Add your custom queries here
  `"${productName}" custom query`,
];
```

### Adjusting Limits

Modify limits in `server/search-service.ts`:

```typescript
// Change number of results per query
await this.search(query, 10); // Default is 10

// Change number of Stack Overflow questions analyzed
.slice(0, 5); // Default is 5

// Change number of GitHub issues analyzed
.slice(0, 5); // Default is 5
```

## API Documentation

### SerpAPI
- Docs: https://serpapi.com/search-api
- Dashboard: https://serpapi.com/dashboard

### Brave Search API
- Docs: https://brave.com/search/api/
- Dashboard: https://search.brave.com/api/dashboard

## Support

If you encounter issues:

1. Check console logs for detailed error messages
2. Verify API keys are correctly set in `.env`
3. Test API keys directly using curl:

**SerpAPI**:
```bash
curl "https://serpapi.com/search?q=test&api_key=YOUR_KEY"
```

**Brave**:
```bash
curl -H "X-Subscription-Token: YOUR_KEY" \
  "https://api.search.brave.com/res/v1/web/search?q=test"
```
