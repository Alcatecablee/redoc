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
**Enterprise Robustness**:
- **Queue System**: BullMQ with Redis for production-ready job queuing, in-memory fallback for development.
- **Database Transactions**: Drizzle ORM for atomic operations preventing data corruption.
- **Input Validation**: Comprehensive Zod schemas for all inputs, including SSRF prevention.
- **Memory Management**: LRU caches for critical services to prevent unbounded memory growth.
- **Parallel URL Discovery**: 10x speed improvement for page crawling.
- **AI Response Validation**: Zod schemas validate all AI outputs.
- **Circuit Breaker Pattern**: Prevents cascading failures from AI providers.
- **Pipeline Timeout Enforcement**: 10-minute hard timeout for jobs with automatic cleanup.
- **Resource Cleanup**: All exit paths properly clean up resources.

### Data Storage
**Database**: PostgreSQL via Supabase (configured October 22, 2025).
**ORM**: Drizzle ORM for type-safe operations.
**Data Model**: Complete enterprise schema with 20 tables including `users`, `documentations`, `payment_history`, `subscription_events`, `api_keys`, `organizations`, `webhooks`, `support_tickets`, `branding_settings`, `activity_logs`, `idempotency_keys`, `documentation_versions`, `documentation_pages`, `page_change_log`, `analytics_events`, `analytics_summary`, and more.
**Status**: ✅ All tables deployed and verified in Supabase.

### AI Integration
**Provider**: Groq API (llama-3.3-70b-versatile model).
**AI Pipeline**: A 3-stage (with an implicit 4th for quality validation) AI pipeline:
1.  **Structure Understanding & Content Extraction**: Analyzes website structure and content.
2.  **Professional Documentation Writing**: Transforms content into Apple/Stripe-style documentation.
3.  **Metadata Generation & SEO Optimization**: Adds SEO-optimized metadata.
4.  **Quality Validation**: Checks for logical flow, clarity, and consistency with auto-refinement.
**Advanced Features**: Dynamic scaling of research depth, source trust scoring, dynamic section generation, and source attribution.

### UI/UX & Features
**Design System**: Cyan-blue color scheme, dark background, Inter typography, glassmorphism effects.
**Theme Presets & Custom Builder**: 5 professional themes with a live switcher and a UI for custom theme creation.
**Progress Tracking**: Visual indicators for generation stages.
**Export System**: Comprehensive export to PDF, DOCX, Markdown, JSON, HTML, and Custom Domain hosting.
**Image Rendering**: Supports image content blocks with lazy loading, alt text, and captions.
**Subscription System**: PayPal recurring subscriptions with Free, Pro, and Enterprise tiers.
**Custom Documentation Pricing**: Tiered packages for one-time custom documentation projects (Standard, Professional, Enterprise).
**Authentication**: Supabase Auth integration for secure user sessions and subscription management.
**Enterprise API Access**: Dedicated API endpoint for programmatic generation with API key authentication for Enterprise users.
**Security Features**: Fail-closed webhook verification, subscriber email validation, comprehensive audit trails, and secure API key management.
**White-Label Customization**: Complete system for white-labeling, including custom branding, logo upload, and email template customization.

## External Dependencies

**Core Services**:
*   **Groq API**: AI model access.
*   **Supabase**: PostgreSQL database hosting and user authentication.
*   **PayPal**: Recurring subscription billing.
*   **BullMQ**: Job queue system.
*   **Redis**: BullMQ job persistence (optional, for production scale).

**Third-party Libraries**:
*   **UI Components**: Radix UI primitives, Shadcn/ui.
*   **Form Validation**: Zod.
*   **Database**: Drizzle ORM.
*   **Styling**: Tailwind CSS, `class-variance-authority`.
*   **State**: TanStack Query.
*   **Utilities**: `date-fns`, `clsx`, `tailwind-merge`, `sharp` (for logo color extraction).

**Development Tools**:
*   TypeScript, ESLint, Vite.