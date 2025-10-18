import fetch from 'node-fetch';

const clientId = process.env.PAYPAL_CLIENT_ID;
const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
const isProduction = process.env.NODE_ENV === 'production';
const PAYPAL_API = isProduction 
  ? 'https://api-m.paypal.com' 
  : 'https://api-m.sandbox.paypal.com';

if (!clientId || !clientSecret) {
  console.warn('PayPal credentials not configured for subscriptions');
}

async function getAccessToken(): Promise<string> {
  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials not configured');
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  
  const response = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  if (!response.ok) {
    throw new Error(`Failed to get PayPal access token: ${response.statusText}`);
  }

  const data = await response.json() as { access_token: string };
  return data.access_token;
}

// Subscription plan IDs (create these once in PayPal dashboard or via API)
export const SUBSCRIPTION_PLANS = {
  pro: process.env.PAYPAL_PRO_PLAN_ID || 'P-PRO19MONTHLY', // $19/mo
  enterprise: process.env.PAYPAL_ENTERPRISE_PLAN_ID || 'P-ENT99MONTHLY' // $99/mo
};

export interface CreateSubscriptionParams {
  planId: string;
  userEmail?: string;
  returnUrl: string;
  cancelUrl: string;
  metadata?: Record<string, any>;
}

export interface SubscriptionResult {
  subscriptionId: string;
  status: string;
  approvalUrl: string | undefined;
}

/**
 * Create a PayPal subscription
 */
export async function createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionResult> {
  const accessToken = await getAccessToken();

  const response = await fetch(`${PAYPAL_API}/v1/billing/subscriptions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'PayPal-Request-Id': `SUB-${Date.now()}-${Math.random().toString(36).slice(2)}`
    },
    body: JSON.stringify({
      plan_id: params.planId,
      subscriber: params.userEmail ? {
        email_address: params.userEmail
      } : undefined,
      application_context: {
        brand_name: 'AI Documentation Generator',
        locale: 'en-US',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'SUBSCRIBE_NOW',
        payment_method: {
          payer_selected: 'PAYPAL',
          payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED'
        },
        return_url: params.returnUrl,
        cancel_url: params.cancelUrl
      },
      custom_id: params.metadata ? JSON.stringify(params.metadata) : undefined
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create PayPal subscription: ${response.statusText} - ${error}`);
  }

  const data = await response.json() as any;
  const approvalLink = data.links?.find((link: any) => link.rel === 'approve')?.href;

  return {
    subscriptionId: data.id,
    status: data.status,
    approvalUrl: approvalLink
  };
}

/**
 * Get subscription details
 */
export async function getSubscription(subscriptionId: string) {
  const accessToken = await getAccessToken();

  const response = await fetch(`${PAYPAL_API}/v1/billing/subscriptions/${subscriptionId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to get PayPal subscription: ${response.statusText}`);
  }

  return await response.json() as any;
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(subscriptionId: string, reason: string = 'User requested cancellation') {
  const accessToken = await getAccessToken();

  const response = await fetch(`${PAYPAL_API}/v1/billing/subscriptions/${subscriptionId}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      reason: reason
    })
  });

  if (!response.ok && response.status !== 204) {
    throw new Error(`Failed to cancel PayPal subscription: ${response.statusText}`);
  }

  return { success: true };
}

/**
 * Verify webhook signature (for security)
 */
export async function verifyWebhookSignature(
  webhookId: string,
  headers: Record<string, string>,
  body: any
): Promise<boolean> {
  const accessToken = await getAccessToken();

  const response = await fetch(`${PAYPAL_API}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      transmission_id: headers['paypal-transmission-id'],
      transmission_time: headers['paypal-transmission-time'],
      cert_url: headers['paypal-cert-url'],
      auth_algo: headers['paypal-auth-algo'],
      transmission_sig: headers['paypal-transmission-sig'],
      webhook_id: webhookId,
      webhook_event: body
    })
  });

  if (!response.ok) {
    console.error('Failed to verify webhook signature');
    return false;
  }

  const data = await response.json() as { verification_status: string };
  return data.verification_status === 'SUCCESS';
}

/**
 * Setup subscription plans (run once to create plans in PayPal)
 */
export async function setupSubscriptionPlans() {
  const accessToken = await getAccessToken();

  // Create product first
  const productResponse = await fetch(`${PAYPAL_API}/v1/catalogs/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'PayPal-Request-Id': `PRODUCT-${Date.now()}`
    },
    body: JSON.stringify({
      name: 'AI Documentation Generator',
      description: 'Professional documentation generation service',
      type: 'SERVICE',
      category: 'SOFTWARE'
    })
  });

  const product = await productResponse.json() as { id: string };
  const productId = product.id;

  console.log('Created Product ID:', productId);

  // Create Pro Plan ($19/mo)
  const proPlanResponse = await fetch(`${PAYPAL_API}/v1/billing/plans`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'PayPal-Request-Id': `PLAN-PRO-${Date.now()}`
    },
    body: JSON.stringify({
      product_id: productId,
      name: 'Pro Plan - Monthly',
      description: 'Unlimited docs, deep research, all export formats',
      billing_cycles: [
        {
          frequency: {
            interval_unit: 'MONTH',
            interval_count: 1
          },
          tenure_type: 'REGULAR',
          sequence: 1,
          total_cycles: 0, // Infinite
          pricing_scheme: {
            fixed_price: {
              value: '19.00',
              currency_code: 'USD'
            }
          }
        }
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee: {
          value: '0',
          currency_code: 'USD'
        },
        setup_fee_failure_action: 'CONTINUE',
        payment_failure_threshold: 3
      }
    })
  });

  const proPlan = await proPlanResponse.json() as { id: string };
  console.log('Created Pro Plan ID:', proPlan.id);

  // Create Enterprise Plan ($99/mo)
  const enterprisePlanResponse = await fetch(`${PAYPAL_API}/v1/billing/plans`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'PayPal-Request-Id': `PLAN-ENT-${Date.now()}`
    },
    body: JSON.stringify({
      product_id: productId,
      name: 'Enterprise Plan - Monthly',
      description: 'API access, priority support, custom AI voices, hosted help centers',
      billing_cycles: [
        {
          frequency: {
            interval_unit: 'MONTH',
            interval_count: 1
          },
          tenure_type: 'REGULAR',
          sequence: 1,
          total_cycles: 0,
          pricing_scheme: {
            fixed_price: {
              value: '99.00',
              currency_code: 'USD'
            }
          }
        }
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee: {
          value: '0',
          currency_code: 'USD'
        },
        setup_fee_failure_action: 'CONTINUE',
        payment_failure_threshold: 3
      }
    })
  });

  const enterprisePlan = await enterprisePlanResponse.json() as { id: string };
  console.log('Created Enterprise Plan ID:', enterprisePlan.id);

  return {
    productId,
    proPlanId: proPlan.id,
    enterprisePlanId: enterprisePlan.id
  };
}
