# Product Implementation Roadmap

This roadmap turns the “Learning vs Creation” strategy into a shippable, multi‑tier product with clear milestones, architecture, and acceptance criteria. It is designed to be realistic, incremental, and production‑ready.

## Vision
Deliver the fastest way to generate, publish, and maintain beautiful product documentation. Two primary modes:
- Learning Mode (Free): Showcase quality on popular tools to drive top‑of‑funnel.
- Creation Mode (Paid): Generate, brand, publish, and auto‑sync docs for customers’ own products.

## Tiers and Promises
- Free: 5 generations/month, public examples (e.g., Supabase, Stripe, Next.js), Markdown/PDF export, no branding.
- Pro ($29–49): Unlimited generations, product‑URL ingestion, custom branding/themes, auto‑sync, Notion/Confluence export, custom domain.
- Team ($99–199): Everything in Pro + multi‑member orgs, collaboration, API access, priority support.
- Enterprise (Custom): On‑prem, white‑label, SSO/SAML, custom integrations, SLA.

---

## Phase 0 — Foundation Stabilization (Done/Continuous)
Scope: Ensure the platform is stable and observable.
- Ensure environment boot: server runs, database URL configured, Supabase credentials set.
- Centralized logging for server, crawler, queue, exports.
- Health checks: `/healthz` (server), background worker liveness, queue depth.
- Feature flags: gate experimental features by tier.
Acceptance:
- Dev/preview responds within 2s; health endpoints green; logs searchable; feature flags toggle features per tier.

---

## Phase 1 — Learning Mode (Free) MVP
Scope: Public demo quality and funnel.

Product
- Landing repositioning: “Generate Professional Documentation for Your Product in Minutes” with dual CTAs: Primary “Generate for My Product”, Secondary “See Supabase Example”.
- Example gallery: Supabase, Stripe, Next.js.
- Limit: 5 generations/month per account (rate‑limit + counters).
- Exports: Markdown (.zip structure) and PDF final doc.

Backend
- Crawl + external research pipeline (site discovery, multi‑page extraction, SERP/StackOverflow/GitHub intake), content synthesis, export packaging.
- Storage: PostgreSQL for metadata; Supabase Storage for export artifacts.
- Rate limiting: per user per month counters with sliding window.

Frontend
- Update hero/CTAs on `src/pages/Index.tsx` and feature grid.
- Simple generation form (URL) with progress + toast notifications.

Acceptance
- A user can enter a URL from the preset catalog and receive full docs + Markdown/PDF within 3 minutes.
- Limit enforced after 5 free generations/month.

---

## Phase 2 — Creation Mode (Pro) MVP
Scope: Paid value for solo founders.

Billing & Access
- Stripe: Checkout, customer portal, webhooks; entitlements mapped to org tier.
- Entitlements: Unlimited generations, branding, export flavors, custom domain, auto‑sync.

Custom Branding/Themes
- Persist per‑org theme: name, colors, font, logo, favicon, CSS variables.
- Theme application: compile CSS variables and render in exports and hosted docs.
- ThemeBuilder UI: live preview, upload brand assets, generate theme tokens from brand kit.

Auto‑Sync (Baseline)
- Scheduling: daily sync job per project; manual “Sync now”.
- Incremental updates: ETag/Last‑Modified checks; content hashing to skip unchanged pages.
- Change log per sync.

Exports
- Markdown bundle (folder hierarchy), HTML bundle, PDF, DOCX.
- Notion/Confluence path via import: generate Notion‑friendly Markdown and Confluence‑friendly HTML/DOCX.

Custom Domain
- Hosted docs per org/project at `{org}.ourdomain.com`.
- Custom domain setup: CNAME to `{org}.ourdomain.com`, automated SSL.

Acceptance
- A Pro user brands docs, sets custom domain, triggers syncs, and downloads all export flavors. Docs reflect theme and are reachable via HTTPS custom domain within 10 minutes of DNS configuration.

---

## Phase 3 — Team Tier
Scope: Collaboration and scale.

Collaboration
- Org members with roles: Owner, Admin, Editor, Viewer.
- Shared projects, activity feed, audit log.

API Access
- Token‑based API to trigger generation/export/sync and fetch artifacts.
- Webhooks for sync completion and export availability.

Advanced Exports
- Notion API integration (optional add‑on): create/update pages in a selected workspace.
- Confluence API integration: publish to a space with sectioned hierarchy.

Acceptance
- Teams collaboratively manage projects; API/webhooks automate workflows; exports can publish to Notion/Confluence spaces with idempotent updates.

---

## Phase 4 — Enterprise
Scope: Security, deployment options, guarantees.

- SSO/SAML (Okta, Azure AD, Google Workspace).
- On‑prem or single‑tenant deployment; bring‑your‑own database and object storage.
- White‑label: remove our brand, custom email templates, analytics opt‑in.
- SLA: uptime, RTO/RPO, priority incident handling.

Acceptance
- Enterprise customers deploy on‑prem or single‑tenant; SSO works; SLA metrics tracked and reported.

---

## System Architecture

Components
- Web App (React + Vite): User interface, ThemeBuilder, generation form, exports download, domain settings.
- API Server (Express/Node): Auth, project/org endpoints, queue enqueue, export service, webhook handlers.
- Worker (Queue): Crawl, research, synthesis, export, post‑process (PDF/DOCX), upload artifacts, update DB.
- Storage: PostgreSQL (Drizzle ORM) for metadata; Supabase Storage for artifacts; optional CDN for hosted docs.

Queues & Jobs
- `crawl:discover`, `crawl:extract`, `research:external`, `synthesis:compose`, `export:*`, `sync:project`.
- Retries with exponential backoff; dead‑letter queue; idempotency keys per URL and content hash.

Scheduling & Webhooks
- Cron for periodic sync per project tier.
- GitHub webhook (optional) to trigger sync when docs or code change.

Domains & Hosting
- Multi‑tenant static hosting for docs (per org/project); build + upload pipeline; automatic SSL.

Observability
- Structured logs, traces around long‑running jobs, metrics: queue depth, job latency, error rates, export sizes, sync durations.

Security
- Per‑org data isolation; scoped access tokens; signed URLs for artifacts; least‑privileged keys.

---

## Data Model (PostgreSQL)

Entities (suggested tables/columns)
- `orgs`: id, name, tier, slug, created_at.
- `users`: id, email, name, created_at.
- `org_members`: org_id, user_id, role, invited_at.
- `projects`: id, org_id, name, base_url, repo_url, custom_domain, status, created_at.
- `themes`: id, org_id, name, tokens_json, logo_url, favicon_url, updated_at.
- `generations`: id, project_id, status, stage, started_at, finished_at, result_summary_json, content_hash.
- `sync_runs`: id, project_id, status, diff_stats_json, started_at, finished_at.
- `exports`: id, project_id, format, url, size_bytes, created_at.
- `limits`: org_id, period_start, period_end, generation_count.
- `api_tokens`: id, org_id, name, token_hash, scopes, created_at, last_used_at.
- `audit_log`: id, org_id, actor_user_id, action, target_type, target_id, meta_json, created_at.

Indexes
- Composite indexes on foreign keys; partial indexes on active projects; hash index for `content_hash` lookups.

---

## Custom Branding/Themes — Technical Plan

- Persist theme tokens per org (colors, typography, radii, shadows); store as JSON.
- Build CSS variables at render time; apply in React and export renderers.
- Include assets (logo, favicon) in exported bundles and hosted docs header.
- Ensure accessibility (contrast pass) and dark mode support.

Acceptance
- Changing theme instantly updates hosted docs; exports reflect theme consistently; contrast checks pass WCAG AA.

### Brand Color Extraction from Site CSS (Deep Dive)

Goals
- Extract brand colors automatically from the target site’s CSS (not only inline styles).
- Build an accessible, stable palette (primary/secondary/accent/background/text) with WCAG AA contrast.
- Fall back to logo-based extraction when CSS signals are weak.

Implementation
- External CSS discovery:
  - Parse `<link rel="stylesheet">` in HTML and resolve absolute URLs.
  - Follow `@import` rules inside stylesheets (depth ≤ 2, same-origin by default).
  - Respect robots.txt and timeouts; cache responses per host.
- CSS parsing and tokenization:
  - Use `postcss` or `css-tree` to parse declarations.
  - Collect color values from: color/background/border/fill/stroke, gradients, and CSS variables.
  - Resolve CSS variables defined in `:root` and common theme scopes; dereference `var()` chains with defaults.
- Brand signal weighting:
  - Boost selectors likely to represent brand (e.g., `:root`, `body`, `.btn-primary`, header/nav/hero sections).
  - Down-weight low-value neutrals and ephemeral utility classes.
  - Prefer colors used across multiple stylesheets and media contexts.
- Palette building:
  - Choose top candidates with clustering in perceptual color space (Lab/LCH).
  - Validate contrast for text on background; auto-adjust via minimal delta E when needed.
  - Produce tokens: `primary`, `secondary`, `accent`, `background`, `surface`, `text`, `text_secondary`, and a 5–8 color swatch.
- Fallbacks:
  - If CSS extraction is inconclusive, run logo palette extraction and merge.
  - If both fail, use default theme.

Acceptance
- For ≥80% of tested sites with non-trivial CSS, extract ≥3 distinct brand colors.
- Generated theme passes WCAG AA for primary text on background.
- Extraction completes within 3–5s per site on P95 with caching enabled.

---

## Auto‑Sync — Technical Plan

- Discovery uses `robots.txt`, sitemaps, and navigation heuristics.
- Fetch with ETag/Last‑Modified; compute normalized content hash; skip unchanged pages.
- Maintain per‑page and aggregate diffs; record `sync_runs` with stats.
- Triggers: cron, manual, optional repo webhook.

Acceptance
- A changed page triggers partial regeneration only for affected sections; typical sync finishes under 5 minutes for 100 pages.

---

## Exports — Technical Plan

Formats
- Markdown: folder hierarchy with frontmatter; image assets preserved; Notion‑friendly markdown variant.
- HTML: semantic sections, theme CSS embedded; Confluence‑friendly HTML variant.
- PDF: print stylesheet; TOC; bookmarks.
- DOCX: structured headings, images, page breaks; Confluence import compatible.

Acceptance
- All exports open without errors; links/images intact; headings/TOC consistent; re‑import to Notion/Confluence succeeds using their native import flows.

### Images — Extraction & Embedding (Deep Dive)

Goals
- Capture meaningful images/screenshots from source pages and include them in generated docs across all export formats.

Implementation
- Extraction:
  - Collect `<img>` elements (skip logos/icons/avatars via filename/size heuristics).
  - Resolve relative URLs; deduplicate via perceptual hash; store alt text when available.
  - Optional screenshot capture of critical sections (hero, dashboards) in a later phase.
- Composition:
  - Insert images into relevant sections via heuristics (nearest heading/topic) or create a “Screenshots” appendix when confidence is low.
  - Add captions sourced from alt text or generated summaries (≤120 chars).
  - Add source attribution where applicable.
- Hosting and safety:
  - Proxy remote images (optional) to avoid mixed content and broken links; cache with content hash.
  - Sanitize URLs in hosted views; lazy-load in the app.
- Exports:
  - HTML/Markdown: already supported; ensure relative paths work in zip bundles.
  - PDF: embed images with layout constraints and captions.
  - DOCX: embed as media with alt text and captions.

Acceptance
- ≥70% of pages with meaningful images produce at least one embedded image in the doc.
- PDF and DOCX exports include images without layout breakage (P95 render < 15s for 30 images).
- Broken or unsafe image URLs are safely skipped and logged.

---

## Custom Domains — Technical Plan

- Subdomain: `{org}.ourdomain.com` via wildcard cert.
- Custom domain: user sets CNAME to `{org}.ourdomain.com`; poll DNS; provision SSL; bind to project; redirect bare to `www` if needed.
- Deploy pipeline uploads built docs per project; cache‑busting via content hash.

Acceptance
- After CNAME propagation, HTTPS works; theme and content load via CDN; domain removal cleans SSL/bindings.

### Publishing as a Primary Export (Product & UX)

Goals
- Make “Publish” (subdomain/custom domain) the primary export path, with a fast “one-click” shareable URL.

Implementation
- UI/UX:
  - Promote a “Publish” button next to “View” as the first action.
  - Optional “Auto‑publish after generation” toggle in the generate form.
  - Show the live URL + copy‑to‑clipboard + “Open” on success.
  - Display publish status and last published timestamp per doc.
- Platform subdomain:
  - Keep on‑demand subdomain creation; ensure idempotent updates on re‑publish.
  - Preserve the same subdomain per doc; updating content requires no further action.
- True custom domains:
  - Add `custom_domain` column; POST `/api/custom-domain/:id` to request binding.
  - DNS verification (TXT/CNAME), polling, and UI checklist.
  - Automated TLS (Let’s Encrypt/Cloudflare) and Host‑based routing to the same renderer.
  - Unbind/rotate flows with safety checks.

Acceptance
- “Publish” is visible and first-class; a new user can generate and publish in ≤ 2 clicks.
- Subdomain publish completes in < 3s; custom domain binds within 10 minutes post‑DNS.
- Re‑publishing updates the live page with no URL changes.

### Hosting Mode (Static + CDN) — Optional Phase
- Add static site build of the doc for CDN hosting, with cache-busted assets and edge headers.
- Use the same renderer to export a static bundle; serve via CDN for custom domains.

---

## Collaboration & API — Technical Plan (Team)

- Role‑based access control; invitations; audit trail of changes and exports.
- REST API: create project, trigger generation/sync, fetch artifacts, list versions; PAT tokens with scopes.
- Webhooks: `generation.completed`, `sync.completed`, `export.ready` with signed payloads.

Acceptance
- Least‑privileged roles enforced; API/webhooks documented with examples; audit log shows key actions.

---

## Pricing, Metering, Entitlements

- Stripe products/prices for Free/Pro/Team; tax and invoices.
- Entitlements table maps tiers to limits/features; evaluated in middleware.
- Metering: monthly window counters; rate limits per tier and per endpoint.

Acceptance
- Upgrades/downgrades instantaneous; proration correct; entitlements enforced server‑side and in UI.

---

## Analytics & Success Metrics

Product KPIs
- Free → Pro conversion rate, weekly active generators, time‑to‑first‑export, export completion rate, sync success rate, custom domain adoption.

Engineering KPIs
- Queue latency, job failure rate, mean sync duration, export size/time distributions, error budgets.

---

## Risks & Mitigations

- Fragile scraping: use multiple strategies, fallback selectors, retries, and respectful rate limiting.
- Legal/compliance: honor robots.txt, respect TOS, provide source attributions, allow site opt‑out.
- Vendor lock‑in: abstract exports and storage; support multiple hosting providers.
- Domain/DNS delays: provide staging subdomain and verification guides.

---

## Multi‑Source Content Synthesis & Attribution — Technical Plan

Goals
- Combine official docs with community knowledge (Stack Overflow, GitHub Issues, high‑quality blogs) into one comprehensive doc with transparent sources.

Implementation
- Ingestion:
  - Official docs prioritized by domain trust; crawl depth/coverage heuristics.
  - Stack Overflow answers filtered by score (e.g., upvotes ≥ 10), recency, and accepted flags.
  - GitHub issues with maintainer responses or linked fixes; exclude “me too” noise.
  - Blogs/tutorials whitelisted by domain and validated by runnable code blocks when possible.
  - Dual search providers (SerpAPI + Brave) with graceful degradation and caching.
- Scoring:
  - Compute a Source Trust Score (domain authority, recency, votes, author signals).
  - De‑duplication and clustering of near‑duplicate content; prefer most trusted source.
- Composition:
  - Insert “Community Solutions” blocks where they augment official guidance.
  - Add inline citations and source badges (Official, Stack Overflow, GitHub, Blog) with links.
  - Maintain a references appendix with all citations.
- Governance:
  - Honor robots.txt and TOS; provide opt‑out for site owners.
  - Clearly attribute sources; never copy private content.

Acceptance
- Each major section includes at least one official reference and (when available) one community citation.
- Community items meet minimum quality thresholds (votes/recency) and render with badges.
- A references appendix is generated with working outbound links.

---

## Milestones & Timeline (sequence‑based)

1. Phase 1 (2–3 weeks)
   - Landing/CTAs, example gallery, generation pipeline hardening, Markdown/PDF exports, free tier limits, basic telemetry.
2. Phase 2 (3–5 weeks)
   - Billing + entitlements, per‑org theming + ThemeBuilder, auto‑sync baseline, HTML/DOCX exports, hosted docs + custom domain, artifact storage lifecycle.
3. Phase 3 (3–4 weeks)
   - Collaboration roles, API/webhooks, Notion/Confluence API integrations, audit log.
4. Phase 4 (as‑needed per deal)
   - SSO/SAML, on‑prem/white‑label, SLA instrumentation.

---

## Acceptance Checklists (Go/No‑Go)

Phase 1
- [ ] Free users can generate up to 5 times/month and download Markdown/PDF.
- [ ] Supabase example link produces consistent, high‑quality docs within 3 minutes.

Phase 2
- [ ] Pro users can brand docs, schedule daily sync, and attach custom domain.
- [ ] Exports (MD/HTML/PDF/DOCX) render correctly and include theme and images.
- [ ] “Publish” is a primary export; on-demand subdomain works in ≤3s; optional auto‑publish post‑generation.
- [ ] Custom domain flow: DNS verification UI, automated TLS, and Host routing.
- [ ] External CSS fetched and parsed; variables resolved; meta `theme-color` honored.
- [ ] Palette passes WCAG AA; fallback to logo extraction when CSS signals are weak.
- [ ] Source badges and inline citations render; references appendix included.
- [ ] Low-quality community content filtered by score/recency thresholds.

Phase 3
- [ ] Teams collaborate with roles; API/webhooks fully documented with examples.
- [ ] Notion/Confluence publishing works idempotently.

Phase 4
- [ ] SSO/SAML integrated and tested with at least two IdPs.
- [ ] On‑prem deployment guide validated; SLA dashboards active.

---

## Implementation Notes
- Prefer Supabase for auth/storage; use existing Drizzle schema patterns for tables.
- Keep crawlers polite: rate limit and identify user agent; add backoff on 429/5xx.
- Make all long‑running tasks queue‑based and idempotent.
- Never log secrets; store credentials securely; use signed URLs for downloads.
- Prioritize accessibility and performance in themed outputs.

---

## Extended Features

### Documentation Templates Gallery
- Purpose: One‑click, beautiful docs by industry (SaaS, E‑commerce, API) with community contributions.
- Data Model: `templates` (id, name, industry, description, version, visibility: public|community|private, tokens_json, sections_json, author_org_id, ratings, created_at, updated_at).
- Backend: CRUD for templates; versioning; template application merges theme tokens and section scaffolds into generation output; validation to ensure headings and slugs are unique.
- Frontend: Gallery with filters, live preview, “Apply Template” to draft or existing project; attribution for community templates.
- Moderation: Submission queue with review + abuse controls.
- Acceptance: Applying a template updates layout/sections/theme without breaking links; revert supported; community templates sandboxed until approved.

### Notion/Confluence/GitBook Integrations (Export‑First, Sync Later)
- Adapters: Export adapters for Notion‑flavored Markdown, Confluence‑friendly HTML/DOCX, GitBook‑compatible Markdown.
- One‑Click Export: UI triggers worker job → uploads via provider API or instructs user to import file when API unavailable.
- Sync Strategy: Phase 1 export‑only; Phase 2 push updates of changed pages (idempotent by stable slugs); Phase 3 bi‑directional with source‑of‑truth rules and conflict resolution (three‑way diff, last‑writer‑wins override with warnings).
- Security: Per‑provider OAuth; store tokens encrypted; scoped permissions.
- Acceptance: A multi‑page doc publishes as nested pages preserving hierarchy and links; re‑publishing updates only changed pages; rollback to previous export is possible.

### Documentation Changelog Generator
- Diff Engine: Use `sync_runs.diff_stats_json` to compute added/changed/removed pages and section‑level diffs; generate human‑readable changelog with timestamps and authorship when available.
- Outputs: In‑app changelog, Markdown file, RSS/Atom feed, webhook `changelog.published`.
- UI: Changelog tab per project with filters (date range, pages), diff viewer for sections.
- Acceptance: After a sync, a changelog is generated within 1 minute; RSS validates; diffs highlight modified sections and link to affected pages.

### Live Documentation Sync (Enhanced)
- Triggers: Polling with conditional requests; optional provider webhooks (GitHub, CMS); on‑demand sync button; backoff to avoid rate limits.
- Scope: Near‑real‑time for Pro/Team (e.g., every 15 min) with per‑site quotas; only changed pages re‑generated; dependency graph to recompose impacted guides.
- Reliability: Idempotent jobs, deduplication via content hash + URL; DLQ and alerting on repeated failures.
- Acceptance: Typical small change (<5 pages) propagates to hosted docs within 5–10 minutes; failures are retried and surfaced in UI.

### AI Chat Assistant Per Doc
- Retrieval: Chunk generated docs; embed with pgvector; store in `doc_embeddings` (id, project_id, section_id, chunk_id, embedding, text, metadata).
- Answering: RAG with citations (section titles + anchors); safety filters; deterministic summaries for export.
- UI: Chat widget on hosted docs; slash commands (/search, /example) and copyable answers; respect org theme.
- Privacy: Project visibility controls; exclude private sections from public chat; signed tokens for access.
- Acceptance: Answers include at least 2 citations; latency P95 < 2.5s on cached corpora; no cross‑tenant leakage verified by tests.

---

## Milestones Update (Priority Ordering)

A. Phase 2 Enhancements (2–3 weeks)
- Live Sync (enhanced) built atop auto‑sync baseline.
- Documentation Changelog Generator with RSS + webhooks.

B. Phase 2.5 (1–2 weeks)
- Documentation Templates Gallery (CRUD, preview, apply, moderation).

C. Phase 3 Add‑Ons (2–3 weeks)
- Export adapters (Notion/Confluence/GitBook) with one‑click publish.
- Begin push‑sync (idempotent updates on change) to Notion/Confluence.

D. Phase 3.5 (2 weeks)
- AI Chat Assistant per Doc (RAG, citations, widget, rate limits).

---

## Acceptance Additions
- [ ] Changelog generated after every sync; RSS validates and includes at least titles, links, timestamps.
- [ ] Live Sync pushes changes to hosted docs within 10 minutes for <5 page deltas.
- [ ] Templates apply without broken links; revert works; moderation in place for community templates.
- [ ] One‑click exports create nested pages in Notion/Confluence/GitBook maintaining hierarchy.
- [ ] AI Chat responses include citations and stay within tenant boundaries.
