import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL!;

if (!connectionString) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

async function testDatabaseOperations() {
  console.log('Testing Supabase database operations...\n');
  
  const sql = postgres(connectionString, { 
    max: 1,
    ssl: 'require'
  });

  try {
    // Test 1: Insert a test user
    console.log('Test 1: Inserting test user...');
    const [user] = await sql`
      INSERT INTO users (email, name, plan) 
      VALUES ('test@docsnap.com', 'Test User', 'free')
      ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
      RETURNING id, email, name, plan, generation_count
    `;
    console.log(`✓ User created/updated: ${user.email} (ID: ${user.id})`);

    // Test 2: Create a test theme
    console.log('\nTest 2: Inserting test theme...');
    const [theme] = await sql`
      INSERT INTO themes (name, user_id, tokens)
      VALUES ('Test Theme', ${user.id.toString()}, '{"primary": "#000000", "secondary": "#ffffff"}')
      RETURNING id, name
    `;
    console.log(`✓ Theme created: ${theme.name} (ID: ${theme.id})`);

    // Test 3: Create test documentation
    console.log('\nTest 3: Inserting test documentation...');
    const [doc] = await sql`
      INSERT INTO documentations (url, title, content, user_id, theme_id)
      VALUES (
        'https://example.com', 
        'Test Documentation', 
        '{"sections": []}',
        ${user.id.toString()},
        ${theme.id}
      )
      RETURNING id, title, url
    `;
    console.log(`✓ Documentation created: ${doc.title} (ID: ${doc.id})`);

    // Test 4: Create API key
    console.log('\nTest 4: Inserting test API key...');
    const [apiKey] = await sql`
      INSERT INTO api_keys (user_id, key_hash, key_prefix, name)
      VALUES (
        ${user.id}, 
        'test_hash_123', 
        'dk_test', 
        'Test API Key'
      )
      ON CONFLICT (key_hash) DO UPDATE SET name = EXCLUDED.name
      RETURNING id, name, key_prefix
    `;
    console.log(`✓ API Key created: ${apiKey.name} (${apiKey.key_prefix}...)`);

    // Test 5: Create activity log
    console.log('\nTest 5: Inserting activity log...');
    await sql`
      INSERT INTO activity_logs (user_id, action, resource_type, resource_id)
      VALUES (
        ${user.id},
        'created',
        'documentation',
        ${doc.id.toString()}
      )
    `;
    console.log(`✓ Activity log created`);

    // Test 6: Query all data
    console.log('\nTest 6: Querying data...');
    const userCount = await sql`SELECT COUNT(*) as count FROM users`;
    const docCount = await sql`SELECT COUNT(*) as count FROM documentations`;
    const themeCount = await sql`SELECT COUNT(*) as count FROM themes`;
    const apiKeyCount = await sql`SELECT COUNT(*) as count FROM api_keys`;
    
    console.log(`✓ Database contains:`);
    console.log(`  - ${userCount[0].count} users`);
    console.log(`  - ${docCount[0].count} documentations`);
    console.log(`  - ${themeCount[0].count} themes`);
    console.log(`  - ${apiKeyCount[0].count} API keys`);

    console.log('\n' + '='.repeat(50));
    console.log('✅ All database operations successful!');
    console.log('✅ Supabase connection is working perfectly!');
    
  } catch (error) {
    console.error('❌ Error during database operations:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

testDatabaseOperations().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
