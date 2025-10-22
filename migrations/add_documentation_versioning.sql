-- Add documentation versioning support
-- Migration: Add current_version field to documentations table and create documentation_versions table

-- Add current_version column to documentations table
ALTER TABLE documentations 
ADD COLUMN IF NOT EXISTS current_version integer NOT NULL DEFAULT 1;

-- Create documentation_versions table
CREATE TABLE IF NOT EXISTS documentation_versions (
  id SERIAL PRIMARY KEY,
  documentation_id INTEGER NOT NULL REFERENCES documentations(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  user_id TEXT,
  theme_id INTEGER,
  subdomain TEXT,
  version_notes TEXT,
  content_hash TEXT,
  is_latest BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by TEXT,
  CONSTRAINT unique_doc_version UNIQUE(documentation_id, version)
);

-- Create index for faster version lookups
CREATE INDEX IF NOT EXISTS idx_documentation_versions_doc_id 
ON documentation_versions(documentation_id);

CREATE INDEX IF NOT EXISTS idx_documentation_versions_latest 
ON documentation_versions(documentation_id, is_latest) 
WHERE is_latest = TRUE;

-- Create index for version ordering
CREATE INDEX IF NOT EXISTS idx_documentation_versions_version 
ON documentation_versions(documentation_id, version DESC);

COMMENT ON TABLE documentation_versions IS 'Stores version history of documentation for tracking changes and enabling rollback';
COMMENT ON COLUMN documentation_versions.content_hash IS 'SHA-256 hash of content for change detection and incremental updates';
