import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL!;

if (!connectionString) {
  console.error('DATABASE_URL must be set');
  process.exit(1);
}

async function main() {
  console.log('Connecting to Supabase database...');
  
  const client = postgres(connectionString, { 
    max: 1,
    ssl: 'require'
  });

  console.log('Fixing schema type mismatches...\n');
  
  try {
    // First, check if there are any rows in the tables
    const userCount = await client`SELECT COUNT(*) as count FROM users`;
    const docCount = await client`SELECT COUNT(*) as count FROM documentations`;
    
    console.log(`Current data: ${userCount[0].count} users, ${docCount[0].count} documentations`);
    
    if (docCount[0].count > 0) {
      console.log('\n⚠️  WARNING: There is existing data in documentations table.');
      console.log('   Changing column types may cause data loss or migration issues.');
      console.log('   Consider backing up your data first.\n');
    }
    
    console.log('Altering documentations.user_id from TEXT to INTEGER...');
    await client`
      ALTER TABLE documentations 
      ALTER COLUMN user_id TYPE INTEGER USING NULLIF(user_id, '')::INTEGER
    `;
    console.log('✓ documentations.user_id changed to INTEGER');
    
    console.log('Altering documentation_versions.user_id from TEXT to INTEGER...');
    await client`
      ALTER TABLE documentation_versions 
      ALTER COLUMN user_id TYPE INTEGER USING NULLIF(user_id, '')::INTEGER
    `;
    console.log('✓ documentation_versions.user_id changed to INTEGER');
    
    console.log('Altering themes.user_id from TEXT to INTEGER...');
    await client`
      ALTER TABLE themes 
      ALTER COLUMN user_id TYPE INTEGER USING user_id::INTEGER
    `;
    console.log('✓ themes.user_id changed to INTEGER');
    
    console.log('Altering analytics_events.user_id from TEXT to INTEGER...');
    await client`
      ALTER TABLE analytics_events 
      ALTER COLUMN user_id TYPE INTEGER USING NULLIF(user_id, '')::INTEGER
    `;
    console.log('✓ analytics_events.user_id changed to INTEGER');
    
    console.log('\n✅ Schema types fixed successfully!');
    console.log('\nNow all user_id foreign keys are INTEGER to match users.id');
    
  } catch (error) {
    console.error('\n❌ Error fixing schema:', error);
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
