# DocSnap - AI-Powered Documentation Generator

## Overview

DocSnap is an AI-powered web application that automatically generates professional documentation from any website. Users input a URL, and the system uses AI to analyze the website structure, extract content, and produce enterprise-quality documentation in multiple formats (PDF, DOCX, or web format). The application emphasizes Apple-style clarity and professional presentation, targeting users who need to create help center documentation quickly.

## Recent Changes

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

**Provider**: Groq API for AI-powered content generation
- **Multi-step Pipeline**: Three-phase AI processing approach
  1. Structure Analysis: Extracts website components and organization
  2. Content Generation: Writes professional documentation with Apple-style clarity
  3. Format Export: Structures output with metadata (title, description, version, sections)

**Processing Flow**:
- Fetches HTML content from user-provided URL
- Strips scripts/styles and extracts text (limited to 10,000 chars)
- Sends to Groq API for structured analysis and documentation generation
- Stores results in database for retrieval

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