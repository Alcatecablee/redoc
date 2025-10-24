import { db } from '../server/db';
import { users } from '../shared/schema';
import { sql } from 'drizzle-orm';

async function setupAdmin() {
  try {
    if (!db) {
      console.error('❌ Database not initialized');
      process.exit(1);
    }

    console.log('🔄 Adding is_admin column if it doesn\'t exist...');
    
    // Add the column using raw SQL
    try {
      await db.execute(sql`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE
      `);
      console.log('✅ is_admin column ready');
    } catch (err: any) {
      if (err.message?.includes('already exists')) {
        console.log('✓ is_admin column already exists');
      } else {
        throw err;
      }
    }

    console.log('\n📋 Current users in database:');
    const allUsers = await db.select({ 
      id: users.id, 
      email: users.email, 
      plan: users.plan,
      is_admin: users.is_admin
    }).from(users);
    
    if (allUsers.length === 0) {
      console.log('⚠️  No users found in database');
      console.log('💡 Please sign up first through the app, then run this script again');
      process.exit(0);
    }

    console.table(allUsers);

    const email = process.argv[2];
    
    if (!email) {
      console.log('\n💡 To make a user admin with enterprise plan, run:');
      console.log('   bun scripts/setup-admin.ts <email>');
      process.exit(0);
    }

    // Find and upgrade the user
    const foundUsers = await db.select().from(users).where(sql`${users.email} = ${email}`);
    
    if (foundUsers.length === 0) {
      console.error(`\n❌ No user found with email: ${email}`);
      process.exit(1);
    }

    const user = foundUsers[0];
    console.log(`\n✓ Found user: ${user.email}`);
    console.log(`  Current plan: ${user.plan}`);
    console.log(`  Current admin: ${user.is_admin || false}`);

    console.log('\n⬆️  Upgrading user to Enterprise Admin...');
    
    const updated = await db
      .update(users)
      .set({
        plan: 'enterprise',
        is_admin: true,
        subscription_status: 'active',
        updated_at: new Date(),
      })
      .where(sql`${users.id} = ${user.id}`)
      .returning();

    console.log('\n✅ User upgraded successfully!');
    console.log(`  Email: ${updated[0].email}`);
    console.log(`  Plan: ${updated[0].plan}`);
    console.log(`  Admin: ${updated[0].is_admin}`);
    console.log(`  Status: ${updated[0].subscription_status}`);
    console.log('\n🎉 You can now access the admin dashboard at /admin');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

setupAdmin();
