import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function makeUserAdminEnterprise(email: string) {
  try {
    if (!db) {
      console.error('❌ Database not initialized');
      process.exit(1);
    }

    console.log(`🔍 Looking for user with email: ${email}`);
    
    const foundUsers = await db.select().from(users).where(eq(users.email, email));
    
    if (foundUsers.length === 0) {
      console.error(`❌ No user found with email: ${email}`);
      console.log('\n💡 Available users:');
      const allUsers = await db.select({ id: users.id, email: users.email, plan: users.plan }).from(users);
      console.table(allUsers);
      process.exit(1);
    }

    const user = foundUsers[0];
    console.log(`✓ Found user: ${user.email} (ID: ${user.id})`);
    console.log(`  Current plan: ${user.plan}`);
    console.log(`  Current admin status: ${user.is_admin || false}`);

    const updated = await db
      .update(users)
      .set({
        plan: 'enterprise',
        is_admin: true,
        subscription_status: 'active',
        updated_at: new Date(),
      })
      .where(eq(users.id, user.id))
      .returning();

    console.log('\n✅ User upgraded successfully!');
    console.log(`  Email: ${updated[0].email}`);
    console.log(`  Plan: ${updated[0].plan}`);
    console.log(`  Admin: ${updated[0].is_admin}`);
    console.log(`  Status: ${updated[0].subscription_status}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

const email = process.argv[2];

if (!email) {
  console.error('❌ Please provide an email address');
  console.log('\nUsage: bun scripts/make-admin.ts <email>');
  console.log('Example: bun scripts/make-admin.ts user@example.com');
  process.exit(1);
}

makeUserAdminEnterprise(email);
