# AI Knowledge Base Generator

> **Transform any website into comprehensive, professional documentation with AI-powered multi-source research.**

## Overview

This application generates enterprise-grade documentation by analyzing websites, performing external research, and synthesizing information from multiple sources including Stack Overflow, GitHub, and community discussions.

### Key Features

- 🔍 **Multi-Source Research**: Analyzes official docs, blog posts, Stack Overflow answers, and GitHub issues
- 🤖 **AI-Powered Synthesis**: Uses OpenAI GPT-5 to create comprehensive, well-structured documentation
- 🌐 **Deep Site Crawling**: Discovers and extracts content from /docs, /blog, /api, and other key sections
- 📚 **Professional Output**: Generates Apple/Stripe-style documentation with proper structure
- 🎨 **Theme Extraction**: Automatically extracts brand colors and styling from source websites
- 📊 **Quality Metrics**: Tracks research quality and comprehensiveness scores

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- API Keys (see Configuration section)

### Installation

```bash
# Clone the repository
git clone <repository-url>

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env and add your API keys

# Push database schema
npm run db:push

# Start development server
npm run dev
```

## Configuration

### Required API Keys

1. **OPENAI_API_KEY** (Required)
   - Get it from: https://platform.openai.com/api-keys
   - Used for AI-powered documentation generation with GPT-5

2. **Search APIs** (At least one recommended)
   - **SERPAPI_KEY**: Primary search provider (https://serpapi.com/)
   - **BRAVE_API_KEY**: Fallback search provider (https://brave.com/search/api/)
   - See [SEARCH_INTEGRATION.md](./SEARCH_INTEGRATION.md) for detailed setup

### Environment Variables

```bash
# AI API
OPENAI_API_KEY=your_openai_api_key

# Search APIs (configure at least one)
SERPAPI_KEY=your_serpapi_key        # Primary (recommended)
BRAVE_API_KEY=your_brave_api_key    # Fallback

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/database
```

## How It Works

### Documentation Generation Pipeline

1. **Stage 1: Site Discovery & Crawling**
   - Analyzes the homepage and navigation
   - Discovers documentation sections (/docs, /blog, /api, etc.)
   - Extracts internal links and builds a sitemap

2. **Stage 2: Multi-Page Content Extraction**
   - Scrapes up to 30 relevant pages
   - Extracts code examples, headings, and images
   - Processes technical content and structure

3. **Stage 3: External Research** (Requires Search API)
   - Performs targeted Google/Brave searches
   - Extracts Stack Overflow answers with solutions
   - Analyzes GitHub issues and discussions
   - Finds community best practices

4. **Stage 4: AI Synthesis**
   - Combines all data sources
   - Generates comprehensive documentation structure
   - Creates sections: Getting Started, Features, Troubleshooting, FAQ, etc.

5. **Stage 5: Professional Formatting**
   - Applies Apple/Stripe documentation style
   - Adds metadata and search optimization
   - Generates export-ready content

### Example Output

For a URL like `https://supabase.com`, the system generates:

✅ **Getting Started Guide** - Step-by-step setup instructions  
✅ **Core Features** - Detailed feature documentation  
✅ **How It Works** - Conceptual explanations  
✅ **Use Cases & Examples** - Real-world implementations  
✅ **Troubleshooting** - Common issues from Stack Overflow/GitHub  
✅ **FAQ** - Questions from community discussions  
✅ **API Reference** - Code examples and endpoints  
✅ **Integrations** - Third-party integration guides  

## Architecture

```
┌─────────────────────────────────────────────────────┐
│              User Provides URL                      │
└────────────────┬────────────────────────────────────┘
                 │
         ┌───────▼────────┐
         │ Site Discovery │  (Crawl homepage, find docs)
         └───────┬────────┘
                 │
    ┌────────────▼─────────────┐
    │ Multi-Page Extraction    │  (Scrape 30+ pages)
    └────────────┬─────────────┘
                 │
    ┌────────────▼─────────────┐
    │  External Research       │  (SerpAPI/Brave Search)
    │  - Stack Overflow        │
    │  - GitHub Issues         │
    │  - Community Discussions │
    └────────────┬─────────────┘
                 │
    ┌────────────▼─────────────┐
    │   AI Synthesis (Groq)    │  (Combine all sources)
    └────────────┬─────────────┘
                 │
    ┌────────────▼─────────────┐
    │  Professional Docs       │  (Apple/Stripe style)
    └──────────────────────────┘
```

## Project Structure

```
├── server/
│   ├── enhanced-generator.ts    # Main documentation pipeline
│   ├── search-service.ts        # Search API integration (SerpAPI/Brave)
│   ├── storage.ts               # Database operations
│   └── routes.ts                # API endpoints
├── src/
│   ├── components/              # React components
│   ├── pages/                   # Application pages
│   └── lib/                     # Utilities
├── ROADMAP.md                   # Implementation roadmap
├── SEARCH_INTEGRATION.md        # Search API setup guide
└── enhanced-prompts.md          # AI prompt templates
```

## API Endpoints

- `POST /api/documentation/generate` - Generate documentation for a URL
- `GET /api/documentation/:id` - Get generated documentation
- `GET /api/documentation` - List all documentation

## Search Integration

The system uses two search providers for redundancy:

### SerpAPI (Primary)
- ✅ Real Google search results
- ✅ Rich snippets and metadata
- ✅ Best quality
- 💰 $50/month for 5,000 searches

### Brave Search API (Fallback)
- ✅ Good quality results
- ✅ Free tier: 2,000 queries/month
- ✅ Privacy-focused
- 💰 Free tier available

See [SEARCH_INTEGRATION.md](./SEARCH_INTEGRATION.md) for complete setup guide.

## Development

```bash
# Start development server with auto-reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint

# Push database schema changes
npm run db:push
```

## Roadmap

See [ROADMAP.md](./ROADMAP.md) for the complete implementation roadmap and future enhancements.

## Tech Stack

- **Frontend**: React, TypeScript, Vite, TailwindCSS, shadcn/ui
- **Backend**: Node.js, Express
- **Database**: PostgreSQL with Drizzle ORM
- **AI**: Groq (Llama 3.3 70B)
- **Search**: SerpAPI (primary), Brave Search API (fallback)
- **Web Scraping**: Cheerio, node-fetch

## Testing Examples

Try generating documentation for these sites to see the comprehensive research in action:

- `https://supabase.com` - Open source Firebase alternative
- `https://taxfy.co.za` - Tax compliance platform
- `https://stripe.com` - Payment processing
- `https://vercel.com` - Deployment platform

## Quality Metrics

The system tracks:

- **Pages Analyzed**: Number of pages scraped from the site
- **External Sources**: Stack Overflow + GitHub + Search results
- **Code Examples Found**: Extracted code snippets
- **Research Quality Score**: 0-100% based on source diversity and depth

## Troubleshooting

### "No search API keys configured"

Add at least one search API key to `.env`:
```bash
SERPAPI_KEY=your_key_here
# or
BRAVE_API_KEY=your_key_here
```

### Documentation seems basic

Ensure search APIs are properly configured. Without them, the system only uses content from the target website.

### Rate limiting errors

The system has built-in rate limiting. If you hit limits:
1. Check your API plan limits
2. Reduce number of queries in `search-service.ts`
3. Increase delay between requests

## License

MIT

## Contributing

Contributions are welcome! Please read the contributing guidelines before submitting PRs.

---

Built with ❤️ using Vite, React, TypeScript, and shadcn/ui
