# DocSnap - AI-Powered Documentation Generator

## Overview

DocSnap is an AI-powered web application that generates professional documentation from any website. Users provide a URL, and the system uses a 3-stage AI pipeline to analyze the website, extract content, and produce enterprise-quality documentation in multiple formats (PDF, DOCX, web). The application aims to create Apple-style clear and professional help center documentation, focusing on business vision, market potential, and project ambitions.

## User Preferences

Preferred communication style: Simple, everyday language.
Design preferences: Clean cyan-blue color scheme like Replit (no purple), solid colors only (no gradients), dark theme, modern glassmorphism effects.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript and Vite, using Shadcn/ui components built on Radix UI primitives.
**Styling**: Tailwind CSS with custom design tokens.
**State Management**: TanStack Query for server state.
**Routing**: React Router for client-side navigation.
**Form Handling**: React Hook Form with Zod validation.
**Design Philosophy**: Modern, elegant design inspired by Replit with cyan-blue color scheme (HSL 200 100% 50%), dark theme (rgb 17, 17, 20), Inter font family, glassmorphism effects with backdrop blur, and solid colors (no gradients). Professional and tech-focused aesthetic with smooth transitions and subtle shadows.

### Backend Architecture

**Runtime**: Node.js with Express.
**Development Server**: `tsx watch` for hot-reloading.
**API Structure**: RESTful endpoints under `/api`.
**Build Tool**: Vite for bundling and serving in production.
**Server Organization**: Main entry point (`server/index.ts`), API routes (`server/routes.ts`), Vite middleware (`server/vite.ts`), storage abstraction (`server/storage.ts`), and database configuration (`server/db.ts`).

### Data Storage

**Database**: PostgreSQL via Neon serverless.
**ORM**: Drizzle ORM for type-safe database operations, with schema in `shared/schema.ts` and migrations in `/migrations`.
**Data Model**: `documentations` table stores generated documentation with `id`, `url`, `title`, `content`, and `generatedAt`. A repository pattern with `IStorage` is used.

### AI Integration

**Provider**: Groq API (llama-3.3-70b-versatile model).
**Comprehensive 3-Stage AI Pipeline**:
1.  **Stage 1: Structure Understanding & Content Extraction**: Analyzes website to classify site type, identify navigation, extract visual elements, map content to documentation categories, and detect technical content. Output is structured JSON with content structure and confidence scores.
2.  **Stage 2: Professional Documentation Writing**: Transforms extracted structure into Apple/Stripe-style documentation. Adheres to guidelines for tone, style, reading level (Grade 8-10), progressive disclosure, and scannable formatting. Output is structured JSON with various content types.
3.  **Stage 3: Metadata Generation & SEO Optimization**: Adds comprehensive metadata (SEO-optimized title, description, keywords, version, language, read time) and searchability optimization. Output is enhanced documentation with metadata and production-ready formatting.
**Processing Flow**: Fetches HTML, extracts images and theme, strips scripts/styles, extracts text, then processes through the 3 AI stages, combining with theme data and storing in the database.
**Quality Validation**: Incorporates a 4th stage for logical flow, clarity, completeness, consistency, and accessibility checks with auto-refinement.
**Theme Extraction**: Advanced color and font detection from websites, supporting various color formats and CSS variables, with filtering for generic fonts.
**Image Support**: Extracts all image URLs, converts relative paths to absolute, and integrates images intelligently via AI prompts.

### UI/UX Decisions

*   **Design System**: Modern, elegant system with cyan-blue color scheme (inspired by Replit), dark background, Inter typography, glassmorphism effects, and solid colors (no gradients).
*   **Theme Presets**: 5 professional themes (Apple Light, GitHub Dark, Stripe Modern, Notion Default, Modern Light) with dynamic application.
*   **Live Theme Switcher**: Interactive UI to switch themes in real-time.
*   **Custom Theme Builder**: UI for creating custom themes with color palette editor, typography controls, real-time preview, WCAG accessibility checker, and import/export.
*   **Brand Kit Integration**: Automatic color extraction from uploaded logos.
*   **Progress Tracking**: Visual 3-stage (or 4-stage with Quality Validation) progress indicators for documentation generation.
*   **Export System**: Comprehensive export to PDF, DOCX, Markdown, JSON, HTML, and **Custom Domain** (on-demand subdomain hosting). Theme-aware outputs with batch export into ZIP.
*   **Custom Domain Export**: On-demand subdomain generation feature. Users click "Domain" export button in Dashboard/Profile to create a shareable custom subdomain URL (e.g., `docs-example-abc123.replit.app`). Subdomain is only generated when explicitly requested, not automatically during documentation creation. Includes full security validation, collision handling with retry logic, and clipboard copy functionality.
*   **Image Rendering**: DocumentationViewer supports image content blocks with lazy loading, alt text, and captions.

## Recent Changes (October 2025)

### Custom Domain Export Feature Refactor
**Date**: October 15, 2025

**Changes Made**:
1. **Removed automatic subdomain generation** from documentation creation pipelines (both legacy and enhanced)
2. **Created on-demand subdomain export API** (`POST /api/export/subdomain/:id`) with security validation and collision handling
3. **Added "Domain" export button** in Dashboard and Profile pages alongside PDF, HTML, MD, DOCX buttons
4. **Removed automatic subdomain display** from Index.tsx (no longer shows "Your Documentation is Live!" section)
5. **Maintained all security measures**: XSS prevention, URL sanitization, subdomain validation with regex, collision retry logic, proper HTTP status codes (409/500/400)

**New User Workflow**:
1. Generate documentation (no subdomain created automatically)
2. Navigate to Dashboard or Profile page
3. Click "Domain" export button next to other export options
4. Receive custom domain URL with toast notification and automatic clipboard copy
5. Subsequent clicks return the same subdomain if already created

**Technical Implementation**:
- Subdomain stored as nullable field in database (initially `null`)
- On-demand generation via `generateSubdomain()` helper with strict validation
- Retry logic handles collisions (max 3 attempts)
- Subdomain middleware in `server/index.ts` serves documentation at custom subdomain URLs
- Security: URL scheme whitelisting, XSS prevention, input sanitization maintained

## External Dependencies

**Core Services**:
*   **Groq API**: AI model access for content generation (`GROQ_API_KEY`).
*   **Neon Database**: Serverless PostgreSQL hosting (`DATABASE_URL`).

**Third-party Libraries**:
*   **UI Components**: Radix UI primitives (`@radix-ui/*`).
*   **Form Validation**: Zod.
*   **Database**: Drizzle ORM with Neon serverless driver.
*   **Styling**: Tailwind CSS with `class-variance-authority`.
*   **State**: TanStack Query.
*   **Utilities**: `date-fns`, `clsx`, `tailwind-merge`.

**Development Tools**:
*   TypeScript, ESLint, Vite plugin for React with SWC compiler, Lovable tagger.