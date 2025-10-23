# Viberdoc - AI-Powered Documentation Generator

## Overview

Viberdoc is an AI-powered web application that generates professional, Apple-style documentation from any website. Users provide a URL, and the system employs a 3-stage AI pipeline to analyze the site, extract content, and produce enterprise-quality documentation in various formats (PDF, DOCX, web). The project aims to deliver clear, professional help center documentation, addressing business vision, market potential, and project ambitions.

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

### Comprehensive Dashboard System
**Three-Tier Dashboard Architecture**: Role-based analytics dashboards for different user personas:

1. **Creator Hub** (`/dashboard`) - Individual Users (Free/Pro):
   - Personal overview with account status and subscription tier
   - Key metrics: Total docs, views, exports, generation quota
   - 30-day activity trends (generations, views, exports)
   - Recent documentation with inline analytics drill-down
   - Document-level analytics: views, visitors, exports, searches, device breakdown, popular pages
   - Usage limit warnings with contextual upgrade prompts
   - One-click export (PDF, DOCX) and document management

2. **Team Command Center** (`/dashboard/team`) - Organization Admins:
   - Organization overview and member count
   - Team metrics: active members, total docs, views, avg per member
   - Top contributors chart with documentation output
   - Team member directory with contribution stats
   - Integration health dashboard (API keys, webhooks)
   - API usage monitoring with rate limits
   - Webhook status and delivery monitoring
   - Team activity feed with recent actions

3. **Enterprise Insights** (`/dashboard/enterprise`) - Business Executives:
   - Executive KPIs: MRR, ARR, active subscriptions, churn rate
   - Revenue trend analysis with monthly breakdown
   - Customer distribution by plan (Free/Pro/Enterprise)
   - Platform-wide analytics (total docs, views, exports)
   - Recent payment transactions
   - Customer segmentation and conversion metrics
   - Quick access to white-label settings and team management

**Shared UI Components**:
- `MetricCard`: KPI display with trend indicators
- `ChartContainer`: Responsive chart wrapper with Recharts integration
- `UpgradePrompt`: Contextual upgrade CTAs for free users
- `EmptyState`: Consistent empty data messaging
- `DashboardLayout`: Unified layout with navigation and actions

**Backend Infrastructure**:
- Dashboard service with data aggregation (`server/services/dashboard-service.ts`)
- RESTful API endpoints: `/api/dashboard/overview`, `/analytics/:id`, `/team`, `/revenue`, `/integrations`
- React Query hooks for data fetching with caching (`src/hooks/use-dashboard.ts`)
- Server-side caching for performance optimization

**Implementation Date**: October 22, 2025

### Configure Your Project Enhancement - Phase 1 ✅
**Custom Orders System** (Implemented October 23, 2025):

**Database Layer**:
- `custom_orders` table: Complete order tracking with 30+ fields including pricing breakdown, requirements analysis, fulfillment status
- `discount_codes` table: Flexible discount system with percentage/fixed amounts, expiry dates, usage limits
- Unique order numbers: Auto-generated format `CO-{timestamp}-{random}` preventing collisions
- Full relational integrity with proper indexes and constraints

**Validation & Security**:
- Comprehensive Zod schemas with business rule enforcement
- Separate schemas for quotes (email optional) vs orders (email required)
- SSRF prevention, URL validation, GitHub repo format validation
- Custom requirements limited to 2000 characters
- Discount code validation with expiry and usage limit checks

**Error Handling**:
- Custom `OrderError` class with specific error codes
- User-friendly error messages with context
- Comprehensive error logging with operation tracking
- Graceful degradation for non-critical failures

**Admin Notifications**:
- Intelligent requirement parsing with complexity scoring (1-100)
- Automatic categorization (compliance, security, integration, branding, etc.)
- Urgency level detection (low/medium/high/critical)
- High-value order flagging (>$2000 USD / >36000 ZAR)
- Console logging with hooks for email/Slack integration

**REST API Endpoints** (`/api/custom-orders`):
- `POST /quote` - Calculate pricing without database write
- `POST /` - Create order with validation and persistence
- `GET /:orderNumber` - Retrieve specific order
- `GET /` - List orders with filtering and pagination
- `PATCH /:orderNumber/status` - Update order status (admin)
- `POST /validate-discount` - Validate discount codes

**Business Logic**:
- Duplicate order prevention (same URL within 24 hours)
- Automatic discount application with business rules
- Estimated delivery date calculation
- Comprehensive pricing breakdown storage
- IP address and user agent tracking for security

**Files Created**:
- `shared/schema.ts` - Database schema additions
- `server/validation/schemas.ts` - Validation schemas
- `server/services/admin-notification-service.ts` - Notification service
- `server/utils/order-errors.ts` - Error handling utilities
- `server/routes/custom-orders.ts` - REST API implementation
- `migrations/add_custom_orders_tables.sql` - Database migration

**Status**: Production-ready, architect-reviewed, all blocking issues resolved

### Configure Your Project Enhancement - Phase 2 ✅
**UX Improvements - Multi-Step Wizard** (Implemented October 23, 2025):

**Multi-Step Wizard Component**:
- `ConfigurationWizard.tsx`: 4-step guided flow with progress indicator
- Step 1: Choose Package (Standard/Professional/Enterprise)
- Step 2: Configure Details (URL, GitHub, requirements, delivery speed)
- Step 3: Review & Confirm (summary with pricing breakdown)
- Step 4: Payment (completion)
- Smooth transitions, validation at each step, ability to go back/forward

**Save & Resume Functionality**:
- `use-local-storage.ts`: Custom React hook for localStorage persistence
- Auto-save every 30 seconds while user is filling out the form
- Resume from last saved state on page reload
- Works for anonymous users (no authentication required)
- Clears saved data after successful order submission

**URL Validation System**:
- `url-validator.ts`: Client-side URL validation utility
- `/api/validate/url`: Server endpoint for format validation
- Security-first approach: Format-only validation to prevent SSRF vulnerabilities
- Validates URL structure, enforces HTTP/HTTPS protocols, checks domain format
- **Trade-off Note**: Reachability check and metadata fetching deferred to future phases due to security complexity (would require DNS resolution with IPv4/IPv6 private range blocking)

**Delivery Date Calculator**:
- `DeliveryCalculator.tsx`: Visual component showing actual delivery dates
- Same-day (12 hours): Adds 12 hours to current time
- Rush (24 hours): Next business day
- Standard (3-5 days): 3 business days
- Displays date, time, timezone, and weekend warnings
- Color-coded visual indicators for delivery speed

**Interactive Pricing Breakdown**:
- `InteractivePricingBreakdown.tsx`: Enhanced pricing display
- Clickable tooltips explaining each cost component
- Market rate comparison showing value
- Visual progress bars for package selection
- Currency display (ZAR with USD equivalent)
- Highlights savings and discounts

**Wizard Integration**:
- `CustomPricingFormWizard.tsx`: Main form component integrating all Phase 2 features
- Combines multi-step wizard, auto-save, validation, delivery calculator, and pricing breakdown
- Smooth UX with error handling and loading states
- Mobile-responsive design matching Viberdoc's cyan-blue theme

**Files Created/Modified**:
- `src/components/ConfigurationWizard.tsx` - Wizard framework
- `src/hooks/use-local-storage.ts` - Persistence hook
- `src/utils/url-validator.ts` - Validation utility
- `src/components/DeliveryCalculator.tsx` - Date calculator
- `src/components/InteractivePricingBreakdown.tsx` - Pricing component
- `src/components/CustomPricingFormWizard.tsx` - Integrated wizard form
- `server/routes/validation.ts` - Validation API endpoint

**Integration**: Custom pricing wizard now displayed on home page (Index.tsx) in dedicated "Configure Your Custom Documentation" section with ID `#custom-pricing`

**Status**: Production-ready with acknowledged limitation on URL reachability checking (security-first approach for MVP)

**Note**: The `/pricing` route displays subscription pricing (Free, Pro, Enterprise monthly plans). The custom pricing wizard (for one-time custom documentation orders) is accessible on the home page.

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