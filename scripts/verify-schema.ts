import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL!;

if (!connectionString) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

async function verifySchema() {
  console.log('Connecting to Supabase database...\n');
  
  const sql = postgres(connectionString, { 
    max: 1,
    ssl: 'require'
  });

  try {
    // Query to get all tables
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;

    console.log(`Found ${tables.length} tables in the database:\n`);

    const expectedTables = [
      'users',
      'payment_history',
      'subscription_events',
      'themes',
      'documentations',
      'documentation_versions',
      'api_keys',
      'organizations',
      'organization_members',
      'webhooks',
      'webhook_deliveries',
      'support_tickets',
      'support_ticket_messages',
      'branding_settings',
      'activity_logs',
      'idempotency_keys',
      'documentation_pages',
      'page_change_log',
      'analytics_events',
      'analytics_summary'
    ];

    const foundTables = tables.map((t: any) => t.table_name);
    
    console.log('Expected Enterprise Tables:');
    for (const table of expectedTables) {
      const exists = foundTables.includes(table);
      console.log(`  ${exists ? '✓' : '✗'} ${table}`);
    }

    const missingTables = expectedTables.filter(t => !foundTables.includes(t));
    const extraTables = foundTables.filter((t: string) => !expectedTables.includes(t));

    console.log('\n' + '='.repeat(50));
    if (missingTables.length === 0) {
      console.log('✅ All expected tables are present!');
    } else {
      console.log(`❌ Missing ${missingTables.length} tables: ${missingTables.join(', ')}`);
    }

    if (extraTables.length > 0) {
      console.log(`ℹ️  Additional tables found: ${extraTables.join(', ')}`);
    }

    // Check column counts for key tables
    console.log('\n' + '='.repeat(50));
    console.log('Table Column Counts:');
    
    for (const tableName of ['users', 'documentations', 'api_keys', 'organizations']) {
      if (foundTables.includes(tableName)) {
        const columns = await sql`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = ${tableName}
          ORDER BY ordinal_position
        `;
        console.log(`  ${tableName}: ${columns.length} columns`);
      }
    }

    console.log('\n✅ Schema verification complete!');
    
  } catch (error) {
    console.error('Error verifying schema:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

verifySchema().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
