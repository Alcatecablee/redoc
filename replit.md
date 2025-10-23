# Viberdoc - AI-Powered Documentation Generator

## Overview
Viberdoc is an AI-powered web application that generates professional, Apple-style documentation from any website. Users provide a URL, and the system employs a 3-stage AI pipeline to analyze the site, extract content, and produce enterprise-quality documentation in various formats (PDF, DOCX, web). The project aims to deliver clear, professional help center documentation, addressing business vision, market potential, and project ambitions.

## User Preferences
Preferred communication style: Simple, everyday language.
Design preferences: Clean cyan-blue color scheme like Replit (no purple), solid colors only (no gradients), dark theme, modern glassmorphism effects.

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