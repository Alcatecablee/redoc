import { Router } from 'express';
import { db } from '../db';
import { organizations, organizationMembers, users } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { withTransaction } from '../utils/transaction';
import { validate } from '../middleware/validation';
import { createOrganizationSchema, addOrganizationMemberSchema } from '../validation/schemas';

const router = Router();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

async function verifySupabaseAuth(req: any, res: any, next: any) {
  try {
    const auth = req.headers.authorization || req.headers.Authorization;
    const token = auth && typeof auth === 'string' ? auth.split(' ')[1] : null;
    if (!token) return res.status(401).json({ error: 'Unauthorized: missing access token' });
    if (!SUPABASE_URL) return res.status(500).json({ error: 'SUPABASE_URL not configured' });

    const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY || '', 'Content-Type': 'application/json' }
    });

    if (!userResp.ok) {
      const text = await userResp.text();
      console.warn('Supabase auth verify failed:', userResp.status, text);
      return res.status(401).json({ error: 'Unauthorized', details: text });
    }

    const userData = await userResp.json();
    req.user = userData;
    return next();
  } catch (err: any) {
    console.error('Error verifying supabase token', err);
    return res.status(500).json({ error: 'Auth verification failed' });
  }
}

// List organizations for current user
router.get('/api/organizations', verifySupabaseAuth, async (req: any, res) => {
  try {
    const user = req.user;
    if (!user || !user.email) return res.status(401).json({ error: 'Unauthorized' });

    // Ensure db present
    if (!db) return res.status(500).json({ error: 'Database not initialized' });

    // Find our user record by email
    const foundUsers = await db.select().from(users).where(eq(users.email, user.email));
    const currentUser = foundUsers[0];

    if (!currentUser) return res.json({ organizations: [] });

    const orgs = await db.select().from(organizations).where(eq(organizations.owner_id, currentUser.id));

    // Also include orgs where user is a member
    const memberRows = await db.select().from(organizationMembers).where(eq(organizationMembers.user_id, currentUser.id));
    const memberOrgIds = memberRows.map((m: any) => m.organization_id);
    const memberOrgs = memberOrgIds.length > 0 ? await db.select().from(organizations).where((org) => org.id.in(memberOrgIds)) : [];

    const combined = [...orgs, ...memberOrgs];

    res.json({ organizations: combined });
  } catch (err: any) {
    console.error('Error listing organizations:', err);
    res.status(500).json({ error: err.message || 'Failed to list organizations' });
  }
});

// Create organization
router.post('/api/organizations', 
  validate(createOrganizationSchema, 'body'),
  async (req: any, res) => {
  try {
    const user = req.user;
    if (!user || !user.email) return res.status(401).json({ error: 'Unauthorized' });
    const { name, slug } = req.body;
    if (!name || !slug) return res.status(400).json({ error: 'Missing name or slug' });
    if (!db) return res.status(500).json({ error: 'Database not initialized' });

    const org = await withTransaction(async (tx) => {
      const foundUsers = await tx.select().from(users).where(eq(users.email, user.email));
      let currentUser = foundUsers[0];

      if (!currentUser) {
        const inserted = await tx.insert(users).values({ email: user.email, name: user.user_metadata?.full_name || null }).returning();
        currentUser = inserted[0];
      }

      const existing = await tx.select().from(organizations).where(eq(organizations.slug, slug));
      if (existing.length > 0) {
        throw new Error('Slug already exists');
      }

      const insertResult = await tx.insert(organizations).values({ name, slug, owner_id: currentUser.id }).returning();
      const newOrg = insertResult[0];

      await tx.insert(organizationMembers).values({ organization_id: newOrg.id, user_id: currentUser.id, role: 'owner' });

      return newOrg;
    });

    res.status(201).json({ organization: org });
  } catch (err: any) {
    console.error('Error creating organization:', err);
    
    if (err.message === 'Slug already exists') {
      return res.status(409).json({ error: 'Slug already exists' });
    }
    
    res.status(500).json({ error: err.message || 'Failed to create organization' });
  }
});

// List members for an org
router.get('/api/organizations/:id/members', async (req: any, res) => {
  try {
    const user = req.user;
    if (!user || !user.email) return res.status(401).json({ error: 'Unauthorized' });
    const orgId = Number(req.params.id);
    if (!orgId) return res.status(400).json({ error: 'Invalid organization id' });
    if (!db) return res.status(500).json({ error: 'Database not initialized' });

    const members = await db.select().from(organizationMembers).where(eq(organizationMembers.organization_id, orgId));
    // join with users
    const detailed = await Promise.all(members.map(async (m: any) => {
      const u = await db.select().from(users).where(eq(users.id, m.user_id));
      return { ...m, user: u[0] || null };
    }));

    res.json({ members: detailed });
  } catch (err: any) {
    console.error('Error listing members:', err);
    res.status(500).json({ error: err.message || 'Failed to list members' });
  }
});

// Add member by email (invites are immediate add for simplicity)
router.post('/api/organizations/:id/members', 
  validate(addOrganizationMemberSchema, 'body'),
  async (req: any, res) => {
  try {
    const user = req.user;
    if (!user || !user.email) return res.status(401).json({ error: 'Unauthorized' });
    const orgId = Number(req.params.id);
    const { email, role = 'member' } = req.body;
    if (!orgId || !email) return res.status(400).json({ error: 'Missing org id or email' });
    if (!db) return res.status(500).json({ error: 'Database not initialized' });

    // Ensure calling user is owner/admin
    const foundUsers = await db.select().from(users).where(eq(users.email, user.email));
    const currentUser = foundUsers[0];
    if (!currentUser) return res.status(403).json({ error: 'User record not found' });

    const membershipCheck = await db.select().from(organizationMembers).where(eq(organizationMembers.organization_id, orgId)).where(eq(organizationMembers.user_id, currentUser.id));
    const callerMembership = membershipCheck[0];
    if (!callerMembership || !['owner','admin'].includes(callerMembership.role)) return res.status(403).json({ error: 'Forbidden: only owners or admins can add members' });

    // Get or create invited user record
    let invited = await db.select().from(users).where(eq(users.email, email));
    let invitedUser = invited[0];
    if (!invitedUser) {
      const inserted = await db.insert(users).values({ email }).returning();
      invitedUser = inserted[0];
    }

    // Prevent duplicate membership
    const exists = await db.select().from(organizationMembers).where(eq(organizationMembers.organization_id, orgId)).where(eq(organizationMembers.user_id, invitedUser.id));
    if (exists.length > 0) return res.status(409).json({ error: 'User already a member' });

    const insertedMember = await db.insert(organizationMembers).values({ organization_id: orgId, user_id: invitedUser.id, role, permissions: JSON.stringify([]) }).returning();

    res.status(201).json({ member: insertedMember[0] });
  } catch (err: any) {
    console.error('Error adding member:', err);
    res.status(500).json({ error: err.message || 'Failed to add member' });
  }
});

// Update member role
router.put('/api/organizations/:id/members/:memberId', async (req: any, res) => {
  try {
    const user = req.user;
    if (!user || !user.email) return res.status(401).json({ error: 'Unauthorized' });
    const orgId = Number(req.params.id);
    const memberId = Number(req.params.memberId);
    const { role } = req.body;
    if (!orgId || !memberId || !role) return res.status(400).json({ error: 'Missing parameters' });
    if (!db) return res.status(500).json({ error: 'Database not initialized' });

    // Ensure caller is owner
    const foundUsers = await db.select().from(users).where(eq(users.email, user.email));
    const currentUser = foundUsers[0];
    if (!currentUser) return res.status(403).json({ error: 'User record not found' });

    const callerMembership = (await db.select().from(organizationMembers).where(eq(organizationMembers.organization_id, orgId)).where(eq(organizationMembers.user_id, currentUser.id)))[0];
    if (!callerMembership || callerMembership.role !== 'owner') return res.status(403).json({ error: 'Only owners may change roles' });

    await db.update(organizationMembers).set({ role }).where(eq(organizationMembers.id, memberId));

    res.json({ success: true });
  } catch (err: any) {
    console.error('Error updating member role:', err);
    res.status(500).json({ error: err.message || 'Failed to update member' });
  }
});

// Remove member
router.delete('/api/organizations/:id/members/:memberId', async (req: any, res) => {
  try {
    const user = req.user;
    if (!user || !user.email) return res.status(401).json({ error: 'Unauthorized' });
    const orgId = Number(req.params.id);
    const memberId = Number(req.params.memberId);
    if (!orgId || !memberId) return res.status(400).json({ error: 'Missing parameters' });
    if (!db) return res.status(500).json({ error: 'Database not initialized' });

    const foundUsers = await db.select().from(users).where(eq(users.email, user.email));
    const currentUser = foundUsers[0];
    if (!currentUser) return res.status(403).json({ error: 'User record not found' });

    const callerMembership = (await db.select().from(organizationMembers).where(eq(organizationMembers.organization_id, orgId)).where(eq(organizationMembers.user_id, currentUser.id)))[0];
    if (!callerMembership || !['owner','admin'].includes(callerMembership.role)) return res.status(403).json({ error: 'Only owners or admins may remove members' });

    await db.delete(organizationMembers).where(eq(organizationMembers.id, memberId));

    res.json({ success: true });
  } catch (err: any) {
    console.error('Error removing member:', err);
    res.status(500).json({ error: err.message || 'Failed to remove member' });
  }
});

export default router;
