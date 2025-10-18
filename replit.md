# DocSnap - AI-Powered Documentation Generator

## Overview

DocSnap is an AI-powered web application that generates professional, Apple-style documentation from any website. Users provide a URL, and the system employs a 3-stage AI pipeline to analyze the site, extract content, and produce enterprise-quality documentation in various formats (PDF, DOCX, web). The project aims to deliver clear, professional help center documentation, addressing business vision, market potential, and project ambitions.

## User Preferences

Preferred communication style: Simple, everyday language.
Design preferences: Clean cyan-blue color scheme like Replit (no purple), solid colors only (no gradients), dark theme, modern glassmorphism effects.

## System Architecture

### Frontend
**Framework**: React with TypeScript and Vite, utilizing Shadcn/ui components built on Radix UI.
**Styling**: Tailwind CSS with custom design tokens.
**State Management**: TanStack Query for server state.
**Routing**: React Router.
**Form Handling**: React Hook Form with Zod validation.
**Design Philosophy**: Modern, elegant design inspired by Replit, featuring a cyan-blue color scheme (HSL 200 100% 50%), dark theme (rgb 17, 17, 20), Inter font, glassmorphism effects, and solid colors.

### Backend
**Runtime**: Node.js with Express.
**API Structure**: RESTful endpoints under `/api`.
**Build Tool**: Vite for production.
**Server Organization**: Main entry point (`server/index.ts`), API routes (`server/routes.ts`), Vite middleware (`server/vite.ts`), storage abstraction (`server/storage.ts`), and database configuration (`server/db.ts`).

### Data Storage
**Database**: PostgreSQL via Neon serverless.
**ORM**: Drizzle ORM for type-safe operations, with schema in `shared/schema.ts`.
**Data Model**: 
- `documentations` table: Stores generated documentation (`id`, `url`, `title`, `content`, `generatedAt`)
- `users` table: User accounts with subscription details (`email`, `plan`, `subscription_id`, `api_key`, `docs_generated_this_month`)
- `paymentHistory` table: Payment transaction audit trail
- `subscriptionEvents` table: Subscription lifecycle event tracking

### AI Integration
**Provider**: Groq API (llama-3.3-70b-versatile model).
**Comprehensive 3-Stage AI Pipeline (with a 4th for Quality Validation)**:
1.  **Structure Understanding & Content Extraction**: Analyzes website for structure, navigation, visual elements, content mapping, and technical content, outputting structured JSON.
2.  **Professional Documentation Writing**: Transforms extracted content into Apple/Stripe-style documentation, adhering to tone, style, and formatting guidelines.
3.  **Metadata Generation & SEO Optimization**: Adds SEO-optimized metadata (title, description, keywords, etc.) and searchability.
4.  **Quality Validation (Implicit 4th Stage)**: Checks for logical flow, clarity, completeness, consistency, and accessibility with auto-refinement.
**Processing Flow**: Involves HTML fetching, image/theme extraction, text processing, and sequential AI stage execution.
**Dynamic Scaling**: AI pipeline adjusts research depth (search results, Stack Overflow, GitHub issues) and truncation limits based on product complexity (small, medium, large).
**Source Trust Scoring**: Implements weighted scoring for source quality (official docs, Stack Overflow/GitHub, blogs) and filters low-quality sources.
**Dynamic Section Generation**: AI analyzes product type to suggest tailored documentation sections (e.g., "Webhooks" for Payment APIs).
**Source Attribution**: Provides clickable markdown links to original sources for technical solutions and code examples.

### UI/UX & Features
**Design System**: Cyan-blue color scheme, dark background, Inter typography, glassmorphism effects.
**Theme Presets & Custom Builder**: 5 professional themes with a live switcher and a UI for creating custom themes, including brand kit integration.
**Progress Tracking**: Visual 3-stage (or 4-stage) indicators for generation.
**Export System**: Comprehensive export to PDF, DOCX, Markdown, JSON, HTML, and **Custom Domain** (on-demand subdomain hosting). Outputs are theme-aware with batch export.
**Custom Domain Export**: On-demand subdomain generation accessible via a "Domain" export button in the Dashboard/Profile, not automatic during documentation creation. Includes security validation and collision handling.
**Image Rendering**: DocumentationViewer supports image content blocks with lazy loading, alt text, and captions.
**Subscription System**: Complete PayPal recurring subscription system with three tiers:
- **Free**: 1 documentation per month, all export formats
- **Pro ($19/month)**: Unlimited documentation generation, priority support
- **Enterprise ($99/month)**: Unlimited generation, API access, dedicated support
**Authentication**: Supabase Auth integration for secure user sessions and subscription management.
**Security Features**: 
- Fail-closed webhook verification (requires PAYPAL_WEBHOOK_ID)
- Subscriber email validation prevents subscription hijacking
- Complete audit trail in subscriptionEvents and paymentHistory tables
- API keys only accessible to authenticated Enterprise subscribers

## External Dependencies

**Core Services**:
*   **Groq API**: AI model access.
*   **Neon Database**: Serverless PostgreSQL hosting.
*   **PayPal**: Recurring subscription billing (Pro/Enterprise plans).
*   **Supabase**: User authentication and session management.

**Third-party Libraries**:
*   **UI Components**: Radix UI primitives.
*   **Form Validation**: Zod.
*   **Database**: Drizzle ORM with Neon serverless driver.
*   **Styling**: Tailwind CSS with `class-variance-authority`.
*   **State**: TanStack Query.
*   **Utilities**: `date-fns`, `clsx`, `tailwind-merge`.

**Development Tools**:
*   TypeScript, ESLint, Vite plugin for React with SWC compiler.

## Setup Requirements

### Required Environment Variables

**PayPal Configuration** (for subscription billing):
- `PAYPAL_CLIENT_ID`: PayPal REST API client ID
- `PAYPAL_CLIENT_SECRET`: PayPal REST API client secret
- `PAYPAL_WEBHOOK_ID`: PayPal webhook ID for signature verification (CRITICAL for security)
- `PAYPAL_MODE`: Set to `sandbox` for testing or `live` for production

**Supabase Configuration** (for authentication):
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous/public API key

**Database**:
- `DATABASE_URL`: PostgreSQL connection string (auto-configured on Replit)

**AI Services**:
- `GROQ_API_KEY`: Groq API key for AI-powered documentation generation

### Security Notes
- The PayPal webhook endpoint uses **fail-closed verification**: it will reject all webhook events if `PAYPAL_WEBHOOK_ID` is not configured, preventing unauthorized subscription activations
- All subscription endpoints require Supabase authentication via Bearer tokens
- Subscriber email validation prevents subscription hijacking attacks
- API keys are only generated for authenticated Enterprise users and shown once