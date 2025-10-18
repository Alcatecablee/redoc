# Supabase Schema Updates Required

Please run the following SQL in your Supabase SQL Editor to create the themes table and add required columns:

```sql
-- Create themes table
CREATE TABLE IF NOT EXISTS themes (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  user_id TEXT NOT NULL,
  tokens JSONB NOT NULL,
  is_default TEXT DEFAULT 'false',
  source_url TEXT,
  confidence_score TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add theme_id column to documentations table
ALTER TABLE documentations 
ADD COLUMN IF NOT EXISTS theme_id INTEGER REFERENCES themes(id);

-- Add subdomain column to documentations table (for custom domains)
ALTER TABLE documentations 
ADD COLUMN IF NOT EXISTS subdomain TEXT UNIQUE;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_themes_user_id ON themes(user_id);
CREATE INDEX IF NOT EXISTS idx_documentations_theme_id ON documentations(theme_id);
CREATE INDEX IF NOT EXISTS idx_documentations_subdomain ON documentations(subdomain);

-- Insert default theme
INSERT INTO themes (name, user_id, tokens, is_default)
VALUES (
  'Modern Light (Default)',
  'system',
  '{"colors":{"primary":"#2563eb","secondary":"#64748b","accent":"#0ea5e9","background":"#ffffff","surface":"#f8fafc","text":"#0f172a","text_secondary":"#475569","border":"#e2e8f0","code_bg":"#f1f5f9","success":"#10b981","warning":"#f59e0b","error":"#ef4444"},"typography":{"font_family":"Inter, -apple-system, system-ui, sans-serif","heading_font":"Inter, -apple-system, system-ui, sans-serif","code_font":"Fira Code, Monaco, Consolas, monospace","base_size":"16px","line_height":"1.6","heading_weights":{"h1":700,"h2":600,"h3":600},"heading_sizes":{"h1":"2.5rem","h2":"2rem","h3":"1.5rem"}},"spacing":{"section":"3rem","paragraph":"1.5rem","list_item":"0.5rem","density":"comfortable"},"styling":{"border_radius":"8px","code_border_radius":"6px","shadow":"0 1px 3px rgba(0,0,0,0.1)"},"layout":{"orientation":"multi"}}',
  'true'
) ON CONFLICT DO NOTHING;
```

After running this SQL, the application will be able to store and retrieve custom themes.
