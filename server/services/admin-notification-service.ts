/**
 * Admin Notification Service
 * 
 * Handles notifications to administrators when custom orders are created,
 * especially when they contain custom requirements that need review.
 */

import type { CustomOrder } from '../../shared/schema';

export interface CustomRequirementsParsed {
  hasCompliance: boolean;
  hasSecurity: boolean;
  hasIntegration: boolean;
  hasCustomBranding: boolean;
  hasDeadline: boolean;
  hasScalability: boolean;
  hasDataPrivacy: boolean;
  wordCount: number;
  estimatedComplexity: number; // 1-100
  categories: string[];
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface OrderNotification {
  orderId: number;
  orderNumber: string;
  email: string;
  url: string;
  tier: string;
  totalAmount: number;
  currency: string;
  customRequirements?: string;
  requirementsParsed?: CustomRequirementsParsed;
  isHighValue: boolean;
  needsReview: boolean;
  createdAt: Date;
}

/**
 * Parse custom requirements text and extract key information
 */
export function parseCustomRequirements(text: string | null | undefined): CustomRequirementsParsed {
  if (!text || text.trim().length === 0) {
    return {
      hasCompliance: false,
      hasSecurity: false,
      hasIntegration: false,
      hasCustomBranding: false,
      hasDeadline: false,
      hasScalability: false,
      hasDataPrivacy: false,
      wordCount: 0,
      estimatedComplexity: 0,
      categories: [],
      urgencyLevel: 'low',
    };
  }

  const lowerText = text.toLowerCase();
  const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;

  // Check for key indicators
  const hasCompliance = /compliance|regulation|legal|audit|gdpr|hipaa|sox|pci|iso/i.test(text);
  const hasSecurity = /security|encryption|authentication|authorization|2fa|mfa|secure|privacy/i.test(text);
  const hasIntegration = /integration|api|webhook|third[- ]party|connect|sync/i.test(text);
  const hasCustomBranding = /brand|logo|theme|color|white[- ]label|custom design/i.test(text);
  const hasDeadline = /urgent|asap|deadline|rush|immediate|critical|emergency/i.test(text);
  const hasScalability = /scale|scalability|performance|load|concurrent|high[- ]traffic/i.test(text);
  const hasDataPrivacy = /privacy|confidential|sensitive|personal data|pii/i.test(text);

  // Build categories list
  const categories: string[] = [];
  if (hasCompliance) categories.push('compliance');
  if (hasSecurity) categories.push('security');
  if (hasIntegration) categories.push('integration');
  if (hasCustomBranding) categories.push('branding');
  if (hasDeadline) categories.push('urgent');
  if (hasScalability) categories.push('scalability');
  if (hasDataPrivacy) categories.push('privacy');

  // Calculate complexity score (1-100)
  let complexityScore = 10; // Base score
  
  // Add points for each category
  if (hasCompliance) complexityScore += 20;
  if (hasSecurity) complexityScore += 15;
  if (hasIntegration) complexityScore += 15;
  if (hasCustomBranding) complexityScore += 10;
  if (hasDeadline) complexityScore += 5;
  if (hasScalability) complexityScore += 15;
  if (hasDataPrivacy) complexityScore += 15;

  // Add points based on word count (more detailed = more complex)
  if (wordCount > 50) complexityScore += 5;
  if (wordCount > 100) complexityScore += 10;
  if (wordCount > 200) complexityScore += 15;

  // Cap at 100
  complexityScore = Math.min(100, complexityScore);

  // Determine urgency level
  let urgencyLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
  if (hasDeadline) {
    if (/emergency|critical|urgent/i.test(text)) {
      urgencyLevel = 'critical';
    } else if (/asap|rush|immediate/i.test(text)) {
      urgencyLevel = 'high';
    } else {
      urgencyLevel = 'medium';
    }
  } else if (hasCompliance || hasSecurity) {
    urgencyLevel = 'medium';
  }

  return {
    hasCompliance,
    hasSecurity,
    hasIntegration,
    hasCustomBranding,
    hasDeadline,
    hasScalability,
    hasDataPrivacy,
    wordCount,
    estimatedComplexity: complexityScore,
    categories,
    urgencyLevel,
  };
}

/**
 * Determine if an order is high value (needs extra attention)
 */
export function isHighValueOrder(amount: number, currency: string): boolean {
  // High value thresholds
  const thresholds = {
    USD: 2000,
    ZAR: 36000, // ~$2000 USD
  };

  const threshold = thresholds[currency as keyof typeof thresholds] || thresholds.USD;
  return amount >= threshold;
}

/**
 * Determine if an order needs admin review
 */
export function needsAdminReview(
  customRequirements: string | null | undefined,
  parsed: CustomRequirementsParsed,
  isHighValue: boolean
): boolean {
  // Always review high-value orders
  if (isHighValue) return true;

  // Review orders with custom requirements
  if (customRequirements && customRequirements.trim().length > 0) {
    // Complex requirements need review
    if (parsed.estimatedComplexity >= 50) return true;
    
    // Critical categories need review
    if (parsed.hasCompliance || parsed.hasSecurity || parsed.hasDataPrivacy) return true;
    
    // Urgent orders need review
    if (parsed.urgencyLevel === 'critical' || parsed.urgencyLevel === 'high') return true;
  }

  return false;
}

/**
 * Format notification message for console/email
 */
export function formatNotificationMessage(notification: OrderNotification): string {
  const lines: string[] = [];
  
  lines.push('='.repeat(60));
  lines.push('🔔 NEW CUSTOM ORDER NOTIFICATION');
  lines.push('='.repeat(60));
  lines.push('');
  
  // Order details
  lines.push(`Order Number: ${notification.orderNumber}`);
  lines.push(`Customer Email: ${notification.email}`);
  lines.push(`Project URL: ${notification.url}`);
  lines.push(`Tier: ${notification.tier}`);
  lines.push(`Total Amount: ${notification.currency} ${notification.totalAmount.toFixed(2)}`);
  lines.push(`Created: ${notification.createdAt.toISOString()}`);
  lines.push('');

  // Flags
  if (notification.isHighValue) {
    lines.push('💰 HIGH VALUE ORDER - Extra attention recommended');
  }
  if (notification.needsReview) {
    lines.push('⚠️  REQUIRES ADMIN REVIEW');
  }
  lines.push('');

  // Custom requirements details
  if (notification.customRequirements && notification.requirementsParsed) {
    lines.push('📝 CUSTOM REQUIREMENTS:');
    lines.push('-'.repeat(60));
    lines.push(notification.customRequirements);
    lines.push('-'.repeat(60));
    lines.push('');
    
    const parsed = notification.requirementsParsed;
    lines.push('🔍 ANALYSIS:');
    lines.push(`  • Complexity Score: ${parsed.estimatedComplexity}/100`);
    lines.push(`  • Urgency Level: ${parsed.urgencyLevel.toUpperCase()}`);
    lines.push(`  • Word Count: ${parsed.wordCount}`);
    
    if (parsed.categories.length > 0) {
      lines.push(`  • Categories: ${parsed.categories.join(', ')}`);
    }
    
    lines.push('');
    lines.push('📊 DETECTED REQUIREMENTS:');
    if (parsed.hasCompliance) lines.push('  ✓ Compliance/Regulatory requirements');
    if (parsed.hasSecurity) lines.push('  ✓ Security requirements');
    if (parsed.hasIntegration) lines.push('  ✓ Integration requirements');
    if (parsed.hasCustomBranding) lines.push('  ✓ Custom branding needs');
    if (parsed.hasDeadline) lines.push('  ✓ Deadline/urgency mentioned');
    if (parsed.hasScalability) lines.push('  ✓ Scalability concerns');
    if (parsed.hasDataPrivacy) lines.push('  ✓ Data privacy requirements');
    lines.push('');
  }

  // Action items
  lines.push('🎯 RECOMMENDED ACTIONS:');
  if (notification.isHighValue) {
    lines.push('  1. Review order details and configuration');
    lines.push('  2. Consider personal outreach to customer');
  }
  if (notification.needsReview && notification.requirementsParsed) {
    lines.push('  1. Review custom requirements carefully');
    lines.push('  2. Contact customer if clarification needed');
    if (notification.requirementsParsed.urgencyLevel === 'critical' || notification.requirementsParsed.urgencyLevel === 'high') {
      lines.push('  3. Prioritize this order - urgent delivery expected');
    }
  }
  
  lines.push('');
  lines.push('='.repeat(60));
  
  return lines.join('\n');
}

/**
 * Send admin notification
 * 
 * Currently logs to console, but can be extended to send emails, Slack messages, etc.
 */
export async function sendAdminNotification(notification: OrderNotification): Promise<void> {
  try {
    // Log to console (always)
    const message = formatNotificationMessage(notification);
    console.log('\n' + message + '\n');

    // TODO: Add email notification support
    // if (process.env.ADMIN_EMAIL) {
    //   await sendEmail({
    //     to: process.env.ADMIN_EMAIL,
    //     subject: `New Custom Order: ${notification.orderNumber}`,
    //     body: message,
    //   });
    // }

    // TODO: Add Slack/Discord webhook support
    // if (process.env.SLACK_WEBHOOK_URL) {
    //   await sendSlackNotification(notification);
    // }

    // Log successful notification
    console.log(`[NOTIFICATION] Admin notification sent for order ${notification.orderNumber}`);
  } catch (error) {
    console.error('[NOTIFICATION] Failed to send admin notification:', error);
    // Don't throw - notifications should not break the order flow
  }
}

/**
 * Create a notification from a custom order
 */
export function createOrderNotification(order: Partial<CustomOrder>): OrderNotification {
  const parsed = parseCustomRequirements(order.custom_requirements);
  const totalAmount = parseFloat(order.total_amount?.toString() || '0');
  const currency = order.currency || 'USD';
  const isHighValue = isHighValueOrder(totalAmount, currency);
  const needsReview = needsAdminReview(order.custom_requirements, parsed, isHighValue);

  return {
    orderId: order.id || 0,
    orderNumber: order.order_number || 'UNKNOWN',
    email: order.email || 'unknown@example.com',
    url: order.url || '',
    tier: order.tier || 'custom',
    totalAmount,
    currency,
    customRequirements: order.custom_requirements || undefined,
    requirementsParsed: parsed,
    isHighValue,
    needsReview,
    createdAt: order.created_at || new Date(),
  };
}

/**
 * Main entry point: notify admins about a new order
 */
export async function notifyAdminsOfNewOrder(order: Partial<CustomOrder>): Promise<void> {
  // Only send notifications if:
  // 1. Order has custom requirements, OR
  // 2. Order is high value
  const totalAmount = parseFloat(order.total_amount?.toString() || '0');
  const isHighValue = isHighValueOrder(totalAmount, order.currency || 'USD');
  const hasCustomRequirements = !!(order.custom_requirements && order.custom_requirements.trim().length > 0);

  if (!hasCustomRequirements && !isHighValue) {
    console.log(`[NOTIFICATION] Skipping notification for standard order ${order.order_number}`);
    return;
  }

  const notification = createOrderNotification(order);
  await sendAdminNotification(notification);
}
