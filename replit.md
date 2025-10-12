# DocSnap - AI-Powered Documentation Generator

## Overview

DocSnap is an AI-powered web application that automatically generates professional documentation from any website. Users input a URL, and the system uses AI to analyze the website structure, extract content, and produce enterprise-quality documentation in multiple formats (PDF, DOCX, or web format). The application emphasizes Apple-style clarity and professional presentation, targeting users who need to create help center documentation quickly.

## Recent Changes

### 3-Stage AI Knowledge Base Generator System (October 12, 2025)
- **Comprehensive AI Pipeline**: Upgraded from single-prompt to professional 3-stage AI system using enterprise-quality prompt engineering
- **Stage 1 - Structure Extraction**: Analyzes websites to extract site classification, navigation hierarchy, visual elements, features, use cases, troubleshooting, FAQ, prerequisites, and terminology with confidence scoring
- **Stage 2 - Professional Writing**: Transforms extracted structure into Apple/Stripe-style documentation with clear, elegant, accessible writing (Grade 8-10 reading level, active voice, scannable format)
- **Stage 3 - Metadata & SEO**: Adds comprehensive metadata (SEO-optimized titles, descriptions, keywords), searchability optimization (tags, search keywords), and production-ready formatting
- **Enhanced Output**: Documentation now includes metadata, searchability fields, and extracted structure alongside polished content sections
- **Quality Improvements**: Progressive disclosure structure, action-oriented content, cross-references, code examples with syntax highlighting, and professional callouts/tips

### Comprehensive Export System with Theme Extraction (October 12, 2025)
- **Enhanced Theme Extraction**: Advanced color and font detection from websites
  - Supports hex, RGB/RGBA, and HSL/HSLA color formats
  - Detects CSS variables and custom properties
  - Extracts colors from background-color, color, and border-color properties
  - Identifies font families from CSS and @font-face rules
  - Filters out generic fonts for better brand consistency
- **Theme-Aware HTML Export**: Standalone HTML files with extracted theme colors and fonts applied via CSS variables
- **Theme-Aware PDF Export**: PDF documents using PDFKit with theme colors for headings, titles, and structure
  - Includes HSL-to-RGB color conversion for comprehensive color support
- **Enhanced Markdown Export**: Includes YAML frontmatter with complete theme metadata (colors, fonts, design tokens)
- **JSON Export**: Full documentation data including extracted theme information
- **Theme Persistence**: Theme data now stored with documentation content in database for consistent export across all formats

### Image Support Enhancement (October 12, 2025)
- **Image Extraction**: Backend now extracts all image URLs from website HTML and converts relative URLs to absolute paths
- **AI-Powered Image Integration**: Updated Groq AI prompt to intelligently select and place relevant images throughout documentation
- **Image Rendering**: DocumentationViewer supports image content blocks with lazy loading, alt text, and optional captions
- **Enterprise Layout**: Complete documentation viewer with sidebar table of contents, navigation tabs, and professional formatting matching Microsoft/Twitter help centers

### Landing Page Enhancement (October 2025)
- **Header Component**: Added professional sticky navigation with logo, menu items (Features, How it Works, Pricing, About), and action buttons (Sign In, Get Started). Fully responsive with mobile menu.
- **Footer Component**: Comprehensive footer with brand information, link columns (Product, Company, Resources, Legal), and social media links (Twitter, GitHub, LinkedIn, Email).
- **Enhanced Hero Section**: Improved visual hierarchy with AI-powered badge, refined headline "Transform Websites into Professional Docs", animated background gradients, and better messaging.
- **Feature Cards**: Updated with better icons (Lightning Fast, Enterprise Quality, Multiple Formats) and improved descriptions.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript and Vite
- **UI Library**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: React Router for client-side navigation
- **Form Handling**: React Hook Form with Zod validation

**Design Philosophy**: The UI follows a modern, elegant design system with custom HSL color scheme, smooth transitions, and glass morphism effects. The application prioritizes visual polish with custom gradients, shadows, and animations defined in CSS variables.

### Backend Architecture

**Runtime**: Node.js with Express
- **Development Server**: tsx watch for hot-reloading
- **API Structure**: RESTful endpoints under `/api` prefix
- **Build Tool**: Vite for bundling and serving in production

**Server Organization**:
- `server/index.ts`: Main server entry point with Express setup
- `server/routes.ts`: API route definitions
- `server/vite.ts`: Vite middleware integration for development
- `server/storage.ts`: Data persistence abstraction layer
- `server/db.ts`: Database connection and configuration

### Data Storage

**Database**: PostgreSQL via Neon serverless
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema Location**: `shared/schema.ts` for cross-environment type sharing
- **Migrations**: Drizzle Kit manages schema migrations in `/migrations`

**Data Model**:
- `documentations` table stores generated documentation with fields: id, url, title, content, and generatedAt timestamp
- Storage layer uses repository pattern with `IStorage` interface for potential future storage backend changes

### AI Integration

**Provider**: Groq API (llama-3.3-70b-versatile model) for AI-powered content generation

**Comprehensive 3-Stage AI Pipeline**: Professional knowledge base generation system using enterprise-quality prompt engineering

**Stage 1: Structure Understanding & Content Extraction**
- **Purpose**: Analyze website and extract comprehensive structured content
- **Process**: 
  - Classifies site type (SaaS, e-commerce, blog, documentation, portfolio, etc.)
  - Identifies navigation hierarchy from menus, headers, and site structure
  - Extracts visual elements (screenshots, diagrams, CTAs, demo videos)
  - Maps content to standard documentation categories
  - Detects technical content (code snippets, API references, configuration examples)
- **Output**: Structured JSON with site classification, navigation hierarchy, visual elements, content structure (overview, features, how-it-works, use cases, troubleshooting, FAQ, prerequisites, terminology), confidence scores, and extraction notes

**Stage 2: Professional Documentation Writing**
- **Purpose**: Transform extracted structure into Apple/Stripe-style polished documentation
- **Writing Guidelines**:
  - Tone & Style: Clear, concise, elegant, confident, conversational but professional
  - Active voice, present tense, Grade 8-10 reading level
  - Progressive disclosure: Quick-start → Overview → Detailed guides
  - Scannable format with headings, bullets, numbered lists
  - Action-oriented content leading with what users can do
- **Content Sections**: Getting Started, Core Features, How It Works, Use Cases & Examples, Technical Reference, Troubleshooting, FAQ, Glossary
- **Output**: Structured JSON with sections containing multiple content types (paragraph, heading, list, code, callout, image, table)

**Stage 3: Metadata Generation & SEO Optimization**
- **Purpose**: Package documentation with professional metadata for production deployment
- **Enhancements**:
  - Comprehensive metadata (SEO-optimized title, meta description, keywords, version, language, estimated read time)
  - Searchability optimization (primary tags, search keywords, synonyms)
  - SEO-friendly section slugs and ordering
  - Content validation and quality checks
- **Output**: Enhanced documentation with metadata, searchability fields, and production-ready formatting

**Processing Flow**:
1. Fetches HTML content from user-provided URL
2. Extracts images and theme (colors, fonts) from HTML/CSS
3. Strips scripts/styles and extracts text content (limited to 10,000 chars)
4. **Stage 1**: Sends to Groq API for structure extraction → Returns comprehensive content structure
5. **Stage 2**: Feeds extracted structure to Groq API → Returns professionally written documentation
6. **Stage 3**: Enhances documentation with Groq API → Returns final package with metadata and SEO
7. Combines all stages with theme data and stores complete enhanced documentation in database

### External Dependencies

**Core Services**:
- **Groq API**: AI model access for content generation (requires GROQ_API_KEY)
- **Neon Database**: Serverless PostgreSQL hosting (requires DATABASE_URL)

**Third-party Libraries**:
- **UI Components**: Radix UI primitives (@radix-ui/*) for accessible, unstyled components
- **Form Validation**: Zod for runtime type validation, integrated with React Hook Form
- **Database**: Drizzle ORM with Neon serverless driver
- **Styling**: Tailwind CSS with class-variance-authority for variant management
- **State**: TanStack Query for async state management
- **Utilities**: date-fns for date formatting, clsx/tailwind-merge for className handling

**Development Tools**:
- TypeScript for type safety across client and server
- ESLint with TypeScript integration
- Vite plugin for React with SWC compiler
- Lovable tagger for component development tracking

### API Design

**Endpoint Structure**:
- `POST /api/generate-docs`: Accepts URL, returns generated documentation
  - Validates URL format
  - Fetches website content
  - Processes through AI pipeline
  - Stores in database
  - Returns structured documentation object

**Error Handling**: Comprehensive validation with user-friendly error messages for missing/invalid URLs, API failures, and processing errors

### Future Extensibility

The architecture supports planned enhancements:
- Multi-URL crawling for full site documentation
- Brand style themes (Apple, Microsoft, Notion)
- Custom AI writing voice options
- Auto-publishing to WordPress/Webflow/GitBook
- Developer API for integration
- Browser extension for instant generation