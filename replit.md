# Viberdoc - AI-Powered Documentation Generator

## Overview
Viberdoc is an AI-powered documentation intelligence platform designed for Developer Relations teams at established companies with vibrant ecosystems (Stripe, Supabase, Next.js, etc.). The platform aggregates scattered community knowledge from 10+ sources (Stack Overflow, GitHub, YouTube, Reddit, DEV.to, etc.) and generates professional, Apple-style documentation. The system employs a 3-stage AI pipeline to analyze websites, research community sources, and produce enterprise-quality documentation in various formats (PDF, DOCX, web).

## Recent Changes (October 25, 2025)
**New Transparent Pricing Page**: Complete redesign of pricing page to reflect DevRel quotation model:
- ✅ **Transparent Formula Display**: Shows exact pricing calculation ($300 + Resources × $5 × Complexity)
- ✅ **Real-World Examples**: 4 example projects (Starter FREE, Growing $675, Established $1,800, Major $5,000)
- ✅ **Mathematically Accurate**: All calculations verified and waiver policy explicitly shown
- ✅ **Premium Add-ons Grid**: Visual showcase of $500-$1,400 enhancement options
- ✅ **ROI Comparison**: Demonstrates 70% savings vs $8,000-$15,000 manual research
- ✅ **Strong CTAs**: Multiple "Get Your Instant Quote" buttons driving to quotation flow
- ✅ **Theme Consistency**: Matches established homepage design (dark gradients, cyan-blue, glass morphism)

**Quotation Page Theme Redesign**: Complete visual overhaul to match established homepage "How It Works" section:
- ✅ **Color Scheme**: Dark gradient background (rgb(14,19,23) to rgb(34,38,46)) with cyan-blue accents (rgb(102,255,228))
- ✅ **Removed Emojis**: Eliminated all emoji characters from production UI (user preference)
- ✅ **Glass Morphism**: Consistent glass morphism effects (from-white/10 to-white/5, border-white/20, backdrop-blur-sm)
- ✅ **Icons**: Switched from lucide-react to Heroicons for visual consistency with homepage
- ✅ **Typography**: Matching font sizes, weights, and spacing from established theme
- ✅ **Loading State**: Analysis loading screen now matches homepage design language
- ✅ **Visual Harmony**: Complete alignment with "How It Works" section styling

**Quotation-Based Pricing System**: Implemented sophisticated instant pricing calculator for DevRel documentation projects:
- **Pricing Formula**: $300 minimum + (Resource Count × $5 × Complexity Multiplier), capped at $5,000
- Complexity tiers: Low (1.0x), Medium (1.5x), High (2.0x) based on community footprint
- Professional 3-column quotation page with glass morphism design
- Premium add-ons: Extended Research ($500), Code Snippets ($700), Migration Guides ($850), API Reference ($1,500), Rush Delivery ($500)
- ROI calculator showing $8,000+ savings vs manual research
- Live pricing breakdown with transparent formula display

**Security Hardening & API Verification**: Comprehensive credential management audit and service testing:
- ✅ All 10 API services tested and verified working (3 AI providers, database, auth, payments, 2 search APIs, video, Redis queue)
- ✅ Removed all hardcoded API keys from repository files
- ✅ Added `.env`, `.env.local`, `.env.production` to `.gitignore`
- ✅ Cleaned up `.env.example` template file
- ✅ Verified all credentials load from Replit Secrets and authenticate successfully
- ✅ PayPal configured for Production mode (ready for real payments)
- ✅ Dual search providers: SerpAPI (187 searches) + Brave Search API (automatic fallback)
- ✅ Redis production queue configured for persistent job storage
- ✅ YouTube API operational for video research
- See API_CREDENTIALS_STATUS.md for complete service status report

**Strategic Pivot to DevRel Market**: Repositioned Viberdoc from general "documentation generator" to a DevRel intelligence platform targeting established products with vibrant ecosystems.
- See DEVREL_PIVOT_STRATEGIC_ROADMAP.md for complete strategic details

## User Preferences
Preferred communication style: Simple, everyday language.
Design preferences: Clean cyan-blue color scheme like Replit using rgb(102,255,228) - NO emojis in production UI, NO gradients (except dark background gradients), dark theme (rgb(14,19,23) to rgb(34,38,46)), modern glassmorphism effects (from-white/10 to-white/5 with backdrop-blur-sm), Heroicons for consistency.

## System Architecture

### UI/UX & Design
The frontend uses React with TypeScript and Vite, styled with Tailwind CSS and Shadcn/ui components (built on Radix UI). The design philosophy emphasizes a modern, elegant aesthetic inspired by Replit, featuring a cyan-blue color scheme (HSL 200 100% 50%), dark theme (rgb 17, 17, 20), Inter font, and glassmorphism effects. It includes 5 professional themes with a live switcher and a UI for custom theme creation.

### Technical Implementation
The backend is built with Node.js and Express, utilizing a RESTful API structure. Key architectural decisions for robustness include:
- **Queue System**: BullMQ with Redis for job queuing (in-memory for development).
- **Database Transactions**: Drizzle ORM ensures atomic operations.
- **Input Validation**: Comprehensive Zod schemas, including SSRF prevention.
- **Memory Management**: LRU caches prevent unbounded memory growth.
- **AI Response Validation**: Zod schemas validate all AI outputs.
- **Circuit Breaker Pattern**: Prevents cascading failures from AI providers.
- **Pipeline Timeout**: 10-minute hard timeout for jobs with automatic cleanup.
- **Parallel URL Discovery**: Improves page crawling speed.
- **Resource Cleanup**: All exit paths properly clean up resources.

### Feature Specifications
- **AI Pipeline**: A 3-stage AI pipeline (Structure Understanding & Content Extraction, Professional Documentation Writing, Metadata Generation & SEO Optimization) with an implicit 4th stage for Quality Validation and auto-refinement. It includes dynamic scaling of research depth, source trust scoring, dynamic section generation, and source attribution.
- **Export System**: Comprehensive export to PDF, DOCX, Markdown, JSON, HTML, and Custom Domain hosting.
- **Image Rendering**: Supports image content blocks with lazy loading, alt text, and captions.
- **Subscription System**: PayPal recurring subscriptions with Free, Pro, and Enterprise tiers, integrated with Supabase Auth for secure user sessions.
- **Custom Documentation System**: A custom orders system with a multi-step wizard for configuring one-time documentation projects (Standard, Professional, Enterprise). It includes package selection, detail configuration, review, payment, and a delivery date calculator. This system features unique order numbers, discount codes, comprehensive Zod validation, and admin notifications with complexity scoring and urgency detection.
- **Dashboard System**: Three-tier architecture (Creator Hub, Team Command Center, Enterprise Insights) providing role-based analytics and management functionalities.
- **Research Feed & Quality Scoring**: Live, granular updates during AI documentation generation, showing detailed AI research activities. A comprehensive quality scoring system (0-100 scale) evaluates documentation based on code examples, readability, completeness, troubleshooting, visual aids, and SEO, with real-time score display and detailed breakdowns.
- **White-Label Customization**: Complete system for white-labeling, including custom branding, logo upload, and email template customization.
- **Enterprise API Access**: Dedicated API endpoint for programmatic generation with API key authentication for Enterprise users.
- **Security Features**: Fail-closed webhook verification, subscriber email validation, comprehensive audit trails, and secure API key management.

### Data Storage
The project uses PostgreSQL via Supabase, managed with Drizzle ORM for type-safe operations. The data model includes 20 tables covering users, documentation, payments, subscriptions, organizations, webhooks, and analytics.

## External Dependencies

### Core Services
*   **Groq API**: AI model access.
*   **Supabase**: PostgreSQL database hosting and user authentication.
*   **PayPal**: Recurring subscription billing.
*   **BullMQ**: Job queue system.
*   **Redis**: BullMQ job persistence.

### Third-party Libraries
*   **UI Components**: Radix UI primitives, Shadcn/ui.
*   **Form Validation**: Zod.
*   **Database**: Drizzle ORM.
*   **Styling**: Tailwind CSS, `class-variance-authority`.
*   **State**: TanStack Query.
*   **Utilities**: `date-fns`, `clsx`, `tailwind-merge`, `sharp`.