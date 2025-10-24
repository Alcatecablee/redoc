import postgres from 'postgres';

async function addAdminField() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable not set');
    process.exit(1);
  }

  console.log('🔗 Connecting to database...');
  const sql = postgres(databaseUrl);

  try {
    console.log('🔍 Checking if is_admin column exists...');
    
    const columnExists = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'is_admin'
    `;

    if (columnExists.length > 0) {
      console.log('✓ is_admin column already exists');
    } else {
      console.log('➕ Adding is_admin column to users table...');
      
      await sql`
        ALTER TABLE users 
        ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT FALSE
      `;
      
      console.log('✅ is_admin column added successfully!');
    }

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await sql.end();
    process.exit(1);
  }
}

addAdminField();
