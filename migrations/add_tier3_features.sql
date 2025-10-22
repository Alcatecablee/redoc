-- Migration: Add Tier 3 Features (Incremental Updates, Analytics, Full-Text Search)
-- Created: October 22, 2025

-- TIER 3.2: Documentation Pages for Incremental Updates
CREATE TABLE IF NOT EXISTS "documentation_pages" (
  "id" SERIAL PRIMARY KEY,
  "documentation_id" INTEGER NOT NULL,
  "url" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "content_hash" TEXT NOT NULL,
  "section_type" TEXT,
  "metadata" JSONB,
  "last_checked_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "last_modified_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY ("documentation_id") REFERENCES "documentations"("id") ON DELETE CASCADE
);

-- Index for fast lookups by documentation
CREATE INDEX IF NOT EXISTS "idx_documentation_pages_doc_id" ON "documentation_pages"("documentation_id");

-- Index for content hash lookups (change detection)
CREATE INDEX IF NOT EXISTS "idx_documentation_pages_hash" ON "documentation_pages"("content_hash");

-- Index for URL lookups
CREATE INDEX IF NOT EXISTS "idx_documentation_pages_url" ON "documentation_pages"("url");


-- TIER 3.2: Page Change Log for Tracking Changes
CREATE TABLE IF NOT EXISTS "page_change_log" (
  "id" SERIAL PRIMARY KEY,
  "page_id" INTEGER NOT NULL,
  "documentation_id" INTEGER NOT NULL,
  "old_hash" TEXT,
  "new_hash" TEXT NOT NULL,
  "change_type" TEXT NOT NULL,
  "diff_summary" TEXT,
  "regenerated" BOOLEAN NOT NULL DEFAULT false,
  "detected_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY ("page_id") REFERENCES "documentation_pages"("id") ON DELETE CASCADE,
  FOREIGN KEY ("documentation_id") REFERENCES "documentations"("id") ON DELETE CASCADE
);

-- Index for tracking changes by documentation
CREATE INDEX IF NOT EXISTS "idx_page_change_log_doc_id" ON "page_change_log"("documentation_id");

-- Index for tracking changes by page
CREATE INDEX IF NOT EXISTS "idx_page_change_log_page_id" ON "page_change_log"("page_id");

-- Index for finding unregenerated changes
CREATE INDEX IF NOT EXISTS "idx_page_change_log_regenerated" ON "page_change_log"("regenerated", "detected_at");


-- TIER 3.4: Analytics Events for Tracking User Behavior
CREATE TABLE IF NOT EXISTS "analytics_events" (
  "id" SERIAL PRIMARY KEY,
  "documentation_id" INTEGER NOT NULL,
  "event_type" TEXT NOT NULL,
  "page_url" TEXT,
  "section_id" TEXT,
  "user_id" TEXT,
  "session_id" TEXT,
  "ip_address" TEXT,
  "user_agent" TEXT,
  "referrer" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY ("documentation_id") REFERENCES "documentations"("id") ON DELETE CASCADE
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS "idx_analytics_events_doc_id" ON "analytics_events"("documentation_id");
CREATE INDEX IF NOT EXISTS "idx_analytics_events_type" ON "analytics_events"("event_type");
CREATE INDEX IF NOT EXISTS "idx_analytics_events_created_at" ON "analytics_events"("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_analytics_events_session" ON "analytics_events"("session_id");


-- TIER 3.4: Analytics Summary for Aggregated Data
CREATE TABLE IF NOT EXISTS "analytics_summary" (
  "id" SERIAL PRIMARY KEY,
  "documentation_id" INTEGER NOT NULL,
  "period_start" TIMESTAMP NOT NULL,
  "period_end" TIMESTAMP NOT NULL,
  "total_views" INTEGER NOT NULL DEFAULT 0,
  "unique_visitors" INTEGER NOT NULL DEFAULT 0,
  "total_exports" INTEGER NOT NULL DEFAULT 0,
  "total_searches" INTEGER NOT NULL DEFAULT 0,
  "avg_time_on_page" INTEGER,
  "popular_pages" JSONB,
  "popular_sections" JSONB,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY ("documentation_id") REFERENCES "documentations"("id") ON DELETE CASCADE,
  UNIQUE("documentation_id", "period_start", "period_end")
);

-- Indexes for analytics summary queries
CREATE INDEX IF NOT EXISTS "idx_analytics_summary_doc_id" ON "analytics_summary"("documentation_id");
CREATE INDEX IF NOT EXISTS "idx_analytics_summary_period" ON "analytics_summary"("period_start", "period_end");


-- TIER 3.3: Full-Text Search Indexes
-- Add tsvector column to documentations table for full-text search
ALTER TABLE "documentations" 
ADD COLUMN IF NOT EXISTS "search_vector" tsvector;

-- Create full-text search index
CREATE INDEX IF NOT EXISTS "idx_documentations_search_vector" 
ON "documentations" USING GIN("search_vector");

-- Create trigger to automatically update search vector
CREATE OR REPLACE FUNCTION update_documentation_search_vector() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.content, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trig_update_documentation_search_vector ON "documentations";
CREATE TRIGGER trig_update_documentation_search_vector 
  BEFORE INSERT OR UPDATE ON "documentations"
  FOR EACH ROW EXECUTE FUNCTION update_documentation_search_vector();

-- Update existing rows
UPDATE "documentations" 
SET search_vector = 
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(content, '')), 'B')
WHERE search_vector IS NULL;


-- Add search vector to documentation_pages for page-level search
ALTER TABLE "documentation_pages"
ADD COLUMN IF NOT EXISTS "search_vector" tsvector;

-- Create full-text search index for pages
CREATE INDEX IF NOT EXISTS "idx_documentation_pages_search_vector"
ON "documentation_pages" USING GIN("search_vector");

-- Create trigger for documentation_pages search vector
CREATE OR REPLACE FUNCTION update_page_search_vector() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.content, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trig_update_page_search_vector ON "documentation_pages";
CREATE TRIGGER trig_update_page_search_vector
  BEFORE INSERT OR UPDATE ON "documentation_pages"
  FOR EACH ROW EXECUTE FUNCTION update_page_search_vector();


-- TIER 3.5: Enhance Activity Logs for Audit Trail (already exists, just add index)
CREATE INDEX IF NOT EXISTS "idx_activity_logs_user_id" ON "activity_logs"("user_id");
CREATE INDEX IF NOT EXISTS "idx_activity_logs_org_id" ON "activity_logs"("organization_id");
CREATE INDEX IF NOT EXISTS "idx_activity_logs_resource" ON "activity_logs"("resource_type", "resource_id");
CREATE INDEX IF NOT EXISTS "idx_activity_logs_created_at" ON "activity_logs"("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_activity_logs_action" ON "activity_logs"("action");

-- Migration complete
