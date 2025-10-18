import { Router } from 'express';
import { db } from '../db';
import { users, paymentHistory, subscriptionEvents } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import {
  createSubscription,
  getSubscription,
  cancelSubscription,
  verifyWebhookSignature,
  SUBSCRIPTION_PLANS
} from '../paypal-subscriptions';
import { generateApiKey } from '../tier-config';

const router = Router();
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Guard against undefined db
function ensureDb() {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

// Authentication middleware
async function verifyAuth(req: any, res: any, next: any) {
  try {
    const auth = req.headers.authorization || req.headers.Authorization;
    const token = auth && typeof auth === 'string' ? auth.split(' ')[1] : null;
    
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: missing access token' });
    }

    if (!SUPABASE_URL) {
      return res.status(500).json({ error: 'SUPABASE_URL not configured on server' });
    }

    const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_ANON_KEY || '',
        'Content-Type': 'application/json',
      },
    });

    if (!userResp.ok) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userData = await userResp.json();
    req.user = userData;
    next();
  } catch (err: any) {
    console.error('Error verifying auth token', err);
    return res.status(500).json({ error: 'Auth verification failed' });
  }
}

// Create subscription
router.post('/create', verifyAuth, async (req, res) => {
  try {
    const { plan, returnUrl, cancelUrl } = req.body;
    const email = req.user?.email;

    if (!plan || !email) {
      return res.status(400).json({ error: 'Plan and email are required' });
    }

    // Determine plan ID
    let planId: string;
    if (plan === 'pro') {
      planId = SUBSCRIPTION_PLANS.pro;
    } else if (plan === 'enterprise') {
      planId = SUBSCRIPTION_PLANS.enterprise;
    } else {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    // Create subscription in PayPal
    const subscription = await createSubscription({
      planId,
      userEmail: email,
      returnUrl: returnUrl || `${req.protocol}://${req.get('host')}/subscription/success`,
      cancelUrl: cancelUrl || `${req.protocol}://${req.get('host')}/subscription/cancel`,
      metadata: { plan, email }
    });

    res.json({
      subscriptionId: subscription.subscriptionId,
      status: subscription.status,
      approvalUrl: subscription.approvalUrl
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

// Verify and activate subscription after user approval
router.post('/activate', verifyAuth, async (req, res) => {
  try {
    const { subscriptionId } = req.body;
    const email = req.user?.email;

    if (!subscriptionId || !email) {
      return res.status(400).json({ error: 'Subscription ID required' });
    }

    // Get subscription details from PayPal
    const subscription = await getSubscription(subscriptionId);

    if (subscription.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Subscription not active' });
    }

    // SECURITY: Verify the subscription belongs to the authenticated user
    const subscriberEmail = subscription.subscriber?.email_address;
    if (!subscriberEmail || subscriberEmail.toLowerCase() !== email.toLowerCase()) {
      return res.status(403).json({ 
        error: 'Subscription does not belong to this account',
        details: 'The email associated with this PayPal subscription does not match your account'
      });
    }

    // Determine plan from subscription
    const planId = subscription.plan_id;
    let plan: 'pro' | 'enterprise' = 'pro';
    if (planId.includes('ENT') || planId.includes('enterprise')) {
      plan = 'enterprise';
    }

    // Check if user exists
    const database = ensureDb();
    const existingUsers = await database.select().from(users).where(eq(users.email, email));
    
    let apiKey: string | null = null;
    if (plan === 'enterprise') {
      apiKey = generateApiKey();
    }

    if (existingUsers.length > 0) {
      // Update existing user
      await database.update(users)
        .set({
          plan,
          subscription_id: subscriptionId,
          subscription_status: 'active',
          api_key: apiKey,
          updated_at: new Date()
        })
        .where(eq(users.email, email));
    } else {
      // Create new user
      await database.insert(users).values({
        email,
        plan,
        subscription_id: subscriptionId,
        subscription_status: 'active',
        api_key: apiKey,
        generation_count: 0
      });
    }

    // Log subscription event
    await database.insert(subscriptionEvents).values({
      user_id: existingUsers.length > 0 ? existingUsers[0].id : (await database.select().from(users).where(eq(users.email, email)))[0].id,
      subscription_id: subscriptionId,
      event_type: 'activated',
      event_data: { plan, activatedAt: new Date() }
    });

    res.json({
      success: true,
      plan,
      subscriptionId,
      apiKey: plan === 'enterprise' ? apiKey : undefined
    });
  } catch (error) {
    console.error('Error activating subscription:', error);
    res.status(500).json({ error: 'Failed to activate subscription' });
  }
});

// Cancel subscription
router.post('/cancel', verifyAuth, async (req, res) => {
  try {
    const email = req.user?.email;

    if (!email) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const database = ensureDb();
    
    // Get user
    const existingUsers = await database.select().from(users).where(eq(users.email, email));
    
    if (existingUsers.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = existingUsers[0];

    if (!user.subscription_id) {
      return res.status(400).json({ error: 'No active subscription found' });
    }

    // Cancel in PayPal
    await cancelSubscription(user.subscription_id, 'User requested cancellation');

    // Update user
    await database.update(users)
      .set({
        plan: 'free',
        subscription_status: 'cancelled',
        api_key: null,
        updated_at: new Date()
      })
      .where(eq(users.email, email));

    // Log cancellation event
    await database.insert(subscriptionEvents).values({
      user_id: user.id,
      subscription_id: user.subscription_id,
      event_type: 'cancelled',
      event_data: { cancelledAt: new Date(), reason: 'User requested cancellation' }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// Get subscription status
router.get('/status', verifyAuth, async (req, res) => {
  try {
    const email = req.user?.email;

    if (!email) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const database = ensureDb();
    
    // Get user
    const existingUsers = await database.select().from(users).where(eq(users.email, email));
    
    if (existingUsers.length === 0) {
      return res.json({
        plan: 'free',
        subscription_status: null,
        generation_count: 0
      });
    }

    const user = existingUsers[0];

    res.json({
      plan: user.plan,
      subscription_status: user.subscription_status,
      subscription_id: user.subscription_id,
      generation_count: user.generation_count,
      api_key: user.plan === 'enterprise' ? user.api_key : undefined
    });
  } catch (error) {
    console.error('Error getting subscription status:', error);
    res.status(500).json({ error: 'Failed to get subscription status' });
  }
});

// PayPal webhook handler
router.post('/webhook', async (req, res) => {
  try {
    const database = ensureDb();
    const event = req.body;
    const eventType = event.event_type;

    // SECURITY: Verify PayPal webhook signature to prevent forged requests
    // FAIL-CLOSED: Reject all webhooks if verification is not configured
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;
    if (!webhookId) {
      console.error('PAYPAL_WEBHOOK_ID not configured - rejecting webhook for security');
      return res.status(503).json({ 
        error: 'Webhook verification not configured',
        message: 'PAYPAL_WEBHOOK_ID environment variable must be set for security'
      });
    }

    const headers = {
      'paypal-transmission-id': req.headers['paypal-transmission-id'] as string || '',
      'paypal-transmission-time': req.headers['paypal-transmission-time'] as string || '',
      'paypal-cert-url': req.headers['paypal-cert-url'] as string || '',
      'paypal-auth-algo': req.headers['paypal-auth-algo'] as string || '',
      'paypal-transmission-sig': req.headers['paypal-transmission-sig'] as string || ''
    };

    const isValid = await verifyWebhookSignature(webhookId, headers, req.body);
    
    if (!isValid) {
      console.error('PayPal webhook signature verification failed - possible forged request!');
      return res.status(401).json({ error: 'Webhook signature verification failed' });
    }

    console.log('PayPal webhook verified and received:', eventType);

    switch (eventType) {
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
        // Subscription activated
        const subscriptionId = event.resource.id;
        const subscriberEmail = event.resource.subscriber?.email_address;
        
        if (subscriberEmail) {
          const planId = event.resource.plan_id;
          let plan: 'pro' | 'enterprise' = 'pro';
          if (planId.includes('ENT') || planId.includes('enterprise')) {
            plan = 'enterprise';
          }

          let apiKey: string | null = null;
          if (plan === 'enterprise') {
            apiKey = generateApiKey();
          }

          // Update or create user
          const existingUsers = await database.select().from(users).where(eq(users.email, subscriberEmail));
          
          let userId: number;
          if (existingUsers.length > 0) {
            userId = existingUsers[0].id;
            await database.update(users)
              .set({
                plan,
                subscription_id: subscriptionId,
                subscription_status: 'active',
                api_key: apiKey,
                updated_at: new Date()
              })
              .where(eq(users.email, subscriberEmail));
          } else {
            const newUser = await database.insert(users).values({
              email: subscriberEmail,
              plan,
              subscription_id: subscriptionId,
              subscription_status: 'active',
              api_key: apiKey,
              generation_count: 0
            }).returning();
            userId = newUser[0].id;
          }

          // Log subscription event
          await database.insert(subscriptionEvents).values({
            user_id: userId,
            subscription_id: subscriptionId,
            event_type: 'activated',
            event_data: event.resource
          });
        }
        break;

      case 'BILLING.SUBSCRIPTION.CANCELLED':
      case 'BILLING.SUBSCRIPTION.EXPIRED':
      case 'BILLING.SUBSCRIPTION.SUSPENDED':
        // Subscription cancelled/expired/suspended
        const cancelledSubscriptionId = event.resource.id;
        const cancelledUsers = await database.select().from(users).where(eq(users.subscription_id, cancelledSubscriptionId));
        
        await database.update(users)
          .set({
            plan: 'free',
            subscription_status: 'cancelled',
            api_key: null,
            updated_at: new Date()
          })
          .where(eq(users.subscription_id, cancelledSubscriptionId));

        if (cancelledUsers.length > 0) {
          await database.insert(subscriptionEvents).values({
            user_id: cancelledUsers[0].id,
            subscription_id: cancelledSubscriptionId,
            event_type: eventType.replace('BILLING.SUBSCRIPTION.', '').toLowerCase(),
            event_data: event.resource
          });
        }
        break;

      case 'PAYMENT.SALE.COMPLETED':
        // Renewal payment completed - record in payment history
        const paymentSubscriptionId = event.resource.billing_agreement_id;
        const amount = event.resource.amount?.total || '0';
        const currency = event.resource.amount?.currency || 'USD';
        
        if (paymentSubscriptionId) {
          const paymentUsers = await database.select().from(users).where(eq(users.subscription_id, paymentSubscriptionId));
          
          if (paymentUsers.length > 0) {
            await database.insert(paymentHistory).values({
              user_id: paymentUsers[0].id,
              subscription_id: paymentSubscriptionId,
              payment_id: event.resource.id,
              amount,
              currency,
              status: 'completed',
              plan: paymentUsers[0].plan,
              payment_type: 'subscription',
              metadata: event.resource
            });
          }
        }
        console.log('Subscription payment completed');
        break;

      case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED':
        // Payment failed - log event
        const failedSubscriptionId = event.resource.id;
        const failedUsers = await database.select().from(users).where(eq(users.subscription_id, failedSubscriptionId));
        
        if (failedUsers.length > 0) {
          await database.insert(subscriptionEvents).values({
            user_id: failedUsers[0].id,
            subscription_id: failedSubscriptionId,
            event_type: 'payment_failed',
            event_data: event.resource
          });
        }
        console.error('Subscription payment failed:', failedSubscriptionId);
        break;
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Error handling PayPal webhook:', error);
    res.sendStatus(500);
  }
});

export default router;
