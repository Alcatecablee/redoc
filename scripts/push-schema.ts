import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import * as schema from '../shared/schema';

const connectionString = process.env.DATABASE_URL!;

if (!connectionString) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

async function main() {
  console.log('Connecting to database...');
  
  const client = postgres(connectionString, { 
    max: 1,
    ssl: 'require'
  });
  
  const db = drizzle(client, { schema });

  console.log('Creating tables...');
  
  try {
    const sql = client;
    
    // Create all tables
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        name TEXT,
        plan TEXT NOT NULL DEFAULT 'free',
        subscription_id TEXT,
        subscription_status TEXT,
        generation_count INTEGER NOT NULL DEFAULT 0,
        api_key TEXT UNIQUE,
        api_usage INTEGER NOT NULL DEFAULT 0,
        balance DECIMAL(10, 2) DEFAULT 0.00,
        last_reset_at TIMESTAMP NOT NULL DEFAULT NOW(),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;
    console.log('✓ users table created');

    await sql`
      CREATE TABLE IF NOT EXISTS payment_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        subscription_id TEXT,
        payment_id TEXT NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        currency TEXT NOT NULL DEFAULT 'USD',
        status TEXT NOT NULL,
        plan TEXT NOT NULL,
        payment_type TEXT NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;
    console.log('✓ payment_history table created');

    await sql`
      CREATE TABLE IF NOT EXISTS subscription_events (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        subscription_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        event_data JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;
    console.log('✓ subscription_events table created');

    await sql`
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
      )
    `;
    console.log('✓ themes table created');

    await sql`
      CREATE TABLE IF NOT EXISTS documentations (
        id SERIAL PRIMARY KEY,
        url TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        user_id TEXT,
        subdomain TEXT UNIQUE,
        theme_id INTEGER,
        current_version INTEGER NOT NULL DEFAULT 1,
        search_vector TSVECTOR,
        generated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;
    console.log('✓ documentations table created');

    await sql`
      CREATE TABLE IF NOT EXISTS documentation_versions (
        id SERIAL PRIMARY KEY,
        documentation_id INTEGER NOT NULL,
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
        created_by TEXT
      )
    `;
    console.log('✓ documentation_versions table created');

    await sql`
      CREATE TABLE IF NOT EXISTS api_keys (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        key_hash TEXT NOT NULL UNIQUE,
        key_prefix TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        scopes JSONB NOT NULL DEFAULT '["read", "write"]',
        rate_limit_per_minute INTEGER NOT NULL DEFAULT 60,
        rate_limit_per_day INTEGER NOT NULL DEFAULT 1000,
        usage_count INTEGER NOT NULL DEFAULT 0,
        last_used_at TIMESTAMP,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMP
      )
    `;
    console.log('✓ api_keys table created');

    await sql`
      CREATE TABLE IF NOT EXISTS organizations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        owner_id INTEGER NOT NULL,
        plan TEXT NOT NULL DEFAULT 'free',
        settings JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;
    console.log('✓ organizations table created');

    await sql`
      CREATE TABLE IF NOT EXISTS organization_members (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        role TEXT NOT NULL DEFAULT 'member',
        permissions JSONB NOT NULL DEFAULT '[]',
        joined_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;
    console.log('✓ organization_members table created');

    await sql`
      CREATE TABLE IF NOT EXISTS webhooks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        organization_id INTEGER,
        url TEXT NOT NULL,
        events JSONB NOT NULL DEFAULT '["documentation.created", "documentation.updated"]',
        secret TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        last_triggered_at TIMESTAMP,
        failure_count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;
    console.log('✓ webhooks table created');

    await sql`
      CREATE TABLE IF NOT EXISTS webhook_deliveries (
        id SERIAL PRIMARY KEY,
        webhook_id INTEGER NOT NULL,
        event_type TEXT NOT NULL,
        payload JSONB NOT NULL,
        response_status INTEGER,
        response_body TEXT,
        delivered_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;
    console.log('✓ webhook_deliveries table created');

    await sql`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        subject TEXT NOT NULL,
        description TEXT NOT NULL,
        priority TEXT NOT NULL DEFAULT 'normal',
        status TEXT NOT NULL DEFAULT 'open',
        assigned_to INTEGER,
        sla_deadline TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        resolved_at TIMESTAMP
      )
    `;
    console.log('✓ support_tickets table created');

    await sql`
      CREATE TABLE IF NOT EXISTS support_ticket_messages (
        id SERIAL PRIMARY KEY,
        ticket_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        message TEXT NOT NULL,
        is_internal BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;
    console.log('✓ support_ticket_messages table created');

    await sql`
      CREATE TABLE IF NOT EXISTS branding_settings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        organization_id INTEGER,
        logo_url TEXT,
        primary_color TEXT,
        secondary_color TEXT,
        font_family TEXT,
        custom_css TEXT,
        white_label_enabled BOOLEAN NOT NULL DEFAULT FALSE,
        custom_domain TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;
    console.log('✓ branding_settings table created');

    await sql`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        organization_id INTEGER,
        action TEXT NOT NULL,
        resource_type TEXT NOT NULL,
        resource_id TEXT,
        metadata JSONB,
        ip_address TEXT,
        user_agent TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;
    console.log('✓ activity_logs table created');

    await sql`
      CREATE TABLE IF NOT EXISTS idempotency_keys (
        id SERIAL PRIMARY KEY,
        key TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL,
        status_code INTEGER,
        response TEXT,
        error TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMP NOT NULL
      )
    `;
    console.log('✓ idempotency_keys table created');

    await sql`
      CREATE TABLE IF NOT EXISTS documentation_pages (
        id SERIAL PRIMARY KEY,
        documentation_id INTEGER NOT NULL,
        url TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        section_type TEXT,
        metadata JSONB,
        search_vector TSVECTOR,
        last_checked_at TIMESTAMP NOT NULL DEFAULT NOW(),
        last_modified_at TIMESTAMP NOT NULL DEFAULT NOW(),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;
    console.log('✓ documentation_pages table created');

    await sql`
      CREATE TABLE IF NOT EXISTS page_change_log (
        id SERIAL PRIMARY KEY,
        page_id INTEGER NOT NULL,
        documentation_id INTEGER NOT NULL,
        old_hash TEXT,
        new_hash TEXT NOT NULL,
        change_type TEXT NOT NULL,
        diff_summary TEXT,
        regenerated BOOLEAN NOT NULL DEFAULT FALSE,
        detected_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;
    console.log('✓ page_change_log table created');

    await sql`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id SERIAL PRIMARY KEY,
        documentation_id INTEGER NOT NULL,
        event_type TEXT NOT NULL,
        page_url TEXT,
        section_id TEXT,
        user_id TEXT,
        session_id TEXT,
        ip_address TEXT,
        user_agent TEXT,
        referrer TEXT,
        metadata JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;
    console.log('✓ analytics_events table created');

    await sql`
      CREATE TABLE IF NOT EXISTS analytics_summary (
        id SERIAL PRIMARY KEY,
        documentation_id INTEGER NOT NULL,
        period_start TIMESTAMP NOT NULL,
        period_end TIMESTAMP NOT NULL,
        total_views INTEGER NOT NULL DEFAULT 0,
        unique_visitors INTEGER NOT NULL DEFAULT 0,
        total_exports INTEGER NOT NULL DEFAULT 0,
        total_searches INTEGER NOT NULL DEFAULT 0,
        avg_time_on_page INTEGER,
        popular_pages JSONB,
        popular_sections JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;
    console.log('✓ analytics_summary table created');

    console.log('\n✅ All tables created successfully!');
    
  } catch (error) {
    if (error instanceof Error && error.message.includes('already exists')) {
      console.log('⚠️  Some tables already exist - skipping...');
    } else {
      console.error('Error creating tables:', error);
      throw error;
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
