/**
 * Custom Orders Routes
 * 
 * Handles all API endpoints for the "Configure Your Project" feature
 * Integrates: Database persistence, Zod validation, Error handling, Admin notifications
 */

import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { customOrders, discountCodes, type InsertCustomOrder } from '../../shared/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import {
  createCustomOrderSchema,
  quoteRequestSchema,
  validateDiscountCodeSchema,
  updateOrderStatusSchema,
  orderQuerySchema,
} from '../validation/schemas';
import {
  OrderErrors,
  handleOrderError,
  logOrderError,
  sanitizeOrderInput,
  successResponse,
} from '../utils/order-errors';
import {
  parseCustomRequirements,
  notifyAdminsOfNewOrder,
} from '../services/admin-notification-service';
import { calculatePrice } from '../pricing';

const router = Router();

/**
 * POST /api/custom-orders/quote
 * Calculate pricing for a custom configuration (no DB write)
 */
router.post('/quote', async (req, res) => {
  try {
    // Sanitize input
    const sanitized = sanitizeOrderInput(req.body);
    
    // Validate with Zod
    const validated = quoteRequestSchema.parse(sanitized);

    // Calculate pricing
    const pricing = calculatePrice(validated, validated.currency);

    res.json(successResponse(pricing, 'Pricing calculated successfully'));
  } catch (error) {
    if (error instanceof z.ZodError) {
      logOrderError(error, { operation: 'calculate_quote', ...req.body });
    }
    handleOrderError(error, res);
  }
});

/**
 * POST /api/custom-orders
 * Create a new custom order in database
 */
router.post('/', async (req, res) => {
  try {
    // Sanitize input
    const sanitized = sanitizeOrderInput(req.body);
    
    // Validate with Zod
    const validated = createCustomOrderSchema.parse(sanitized);

    // Calculate pricing
    const pricing = calculatePrice(validated, validated.currency);

    // Parse custom requirements
    const requirementsParsed = parseCustomRequirements(validated.customRequirements);

    // Check for duplicate orders (same URL within last 24 hours)
    if (db) {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const existing = await db
        .select()
        .from(customOrders)
        .where(
          and(
            eq(customOrders.url, validated.url),
            gte(customOrders.created_at, yesterday),
            sql`${customOrders.status} IN ('quote', 'pending_payment', 'processing')`
          )
        )
        .limit(1);

      if (existing.length > 0) {
        throw OrderErrors.duplicateOrder(validated.url);
      }
    }

    // Apply discount code if provided
    let discountAmount = 0;
    if (validated.discountCode && db) {
      const [discount] = await db
        .select()
        .from(discountCodes)
        .where(eq(discountCodes.code, validated.discountCode))
        .limit(1);

      if (!discount) {
        throw OrderErrors.invalidDiscountCode(validated.discountCode);
      }

      if (!discount.is_active) {
        throw OrderErrors.invalidDiscountCode(validated.discountCode);
      }

      if (discount.valid_until && new Date(discount.valid_until) < new Date()) {
        throw OrderErrors.discountCodeExpired(validated.discountCode, new Date(discount.valid_until));
      }

      if (discount.max_uses && discount.current_uses >= discount.max_uses) {
        throw OrderErrors.discountCodeMaxUses(validated.discountCode);
      }

      if (discount.min_order_amount && pricing.total < parseFloat(discount.min_order_amount.toString())) {
        throw OrderErrors.businessRuleViolation(
          'min_order_amount',
          `This discount code requires a minimum order amount of ${validated.currency} ${discount.min_order_amount}`
        );
      }

      // Calculate discount
      if (discount.discount_type === 'percentage') {
        discountAmount = (pricing.total * parseFloat(discount.discount_value.toString())) / 100;
      } else {
        discountAmount = parseFloat(discount.discount_value.toString());
      }
    }

    const totalWithDiscount = Math.max(0, pricing.total - discountAmount);

    // Generate unique order number
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const orderNumber = `CO-${timestamp}-${randomSuffix}`;

    // Calculate estimated delivery date
    const deliveryHours = {
      'standard': 72,
      'rush': 24,
      'same-day': 12,
    }[validated.delivery];
    const estimatedDelivery = new Date(Date.now() + deliveryHours * 60 * 60 * 1000);

    // Prepare order data
    const orderData: InsertCustomOrder = {
      order_number: orderNumber,
      email: validated.email,
      url: validated.url,
      github_repo: validated.githubRepo || null,
      tier: validated.tier,
      sections: validated.sections,
      source_depth: validated.sourceDepth,
      delivery: validated.delivery,
      formats: validated.formats as any,
      branding: validated.branding,
      youtube_options: (validated.youtubeOptions || []) as any,
      seo_options: (validated.seoOptions || []) as any,
      enterprise_features: (validated.enterpriseFeatures || []) as any,
      custom_requirements: validated.customRequirements || null,
      requirements_parsed: requirementsParsed as any,
      requirements_complexity_score: requirementsParsed.estimatedComplexity,
      pricing_breakdown: pricing as any,
      subtotal: pricing.total.toString(),
      discount_amount: discountAmount.toString(),
      tax_amount: '0.00',
      total_amount: totalWithDiscount.toString(),
      currency: validated.currency,
      discount_code: validated.discountCode || null,
      status: 'quote',
      payment_status: 'pending',
      estimated_delivery_date: estimatedDelivery,
      ip_address: req.ip || null,
      user_agent: req.get('user-agent') || null,
    };

    // Insert into database
    if (!db) {
      throw OrderErrors.databaseError('creating order');
    }

    const [createdOrder] = await db
      .insert(customOrders)
      .values(orderData)
      .returning();

    // Increment discount code usage if applicable
    if (validated.discountCode) {
      await db
        .update(discountCodes)
        .set({ 
          current_uses: sql`${discountCodes.current_uses} + 1`
        })
        .where(eq(discountCodes.code, validated.discountCode));
    }

    // Send admin notification (async, don't wait)
    notifyAdminsOfNewOrder(createdOrder).catch(err => {
      console.error('[NOTIFICATION] Failed to notify admins:', err);
    });

    console.log(`[CUSTOM ORDER] Created order ${createdOrder.order_number} for ${createdOrder.url}`);

    res.status(201).json(successResponse({
      order: {
        id: createdOrder.id,
        orderNumber: createdOrder.order_number,
        status: createdOrder.status,
        totalAmount: createdOrder.total_amount,
        currency: createdOrder.currency,
        estimatedDeliveryDate: createdOrder.estimated_delivery_date,
      }
    }, 'Order created successfully'));

  } catch (error) {
    logOrderError(error as Error, { operation: 'create_order', ...req.body });
    handleOrderError(error, res);
  }
});

/**
 * GET /api/custom-orders/:orderNumber
 * Get a specific order by order number
 */
router.get('/:orderNumber', async (req, res) => {
  try {
    const { orderNumber } = req.params;

    if (!db) {
      throw OrderErrors.databaseError('fetching order');
    }

    const [order] = await db
      .select()
      .from(customOrders)
      .where(eq(customOrders.order_number, orderNumber))
      .limit(1);

    if (!order) {
      throw OrderErrors.orderNotFound(orderNumber);
    }

    res.json(successResponse({ order }));
  } catch (error) {
    logOrderError(error as Error, { operation: 'get_order', orderNumber: req.params.orderNumber });
    handleOrderError(error, res);
  }
});

/**
 * GET /api/custom-orders
 * List orders with filtering and pagination
 */
router.get('/', async (req, res) => {
  try {
    const validated = orderQuerySchema.parse(req.query);

    if (!db) {
      throw OrderErrors.databaseError('listing orders');
    }

    // Build where conditions
    const conditions: any[] = [];
    
    if (validated.status) {
      conditions.push(eq(customOrders.status, validated.status));
    }
    if (validated.paymentStatus) {
      conditions.push(eq(customOrders.payment_status, validated.paymentStatus));
    }
    if (validated.tier) {
      conditions.push(eq(customOrders.tier, validated.tier));
    }
    if (validated.fromDate) {
      conditions.push(gte(customOrders.created_at, new Date(validated.fromDate)));
    }
    if (validated.toDate) {
      conditions.push(lte(customOrders.created_at, new Date(validated.toDate)));
    }

    // Query orders
    const orders = await db
      .select()
      .from(customOrders)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(sql`${customOrders.created_at} DESC`)
      .limit(validated.limit)
      .offset((validated.page - 1) * validated.limit);

    // Get total count
    const [{ count }] = await db
      .select({ count: sql`count(*)` })
      .from(customOrders)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    res.json(successResponse({
      orders,
      pagination: {
        page: validated.page,
        limit: validated.limit,
        total: Number(count),
        totalPages: Math.ceil(Number(count) / validated.limit),
      }
    }));
  } catch (error) {
    logOrderError(error as Error, { operation: 'list_orders', query: req.query });
    handleOrderError(error, res);
  }
});

/**
 * PATCH /api/custom-orders/:orderNumber/status
 * Update order status (admin only - TODO: add auth middleware)
 */
router.patch('/:orderNumber/status', async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const validated = updateOrderStatusSchema.parse(req.body);

    if (!db) {
      throw OrderErrors.databaseError('updating order status');
    }

    const updateData: any = {};
    if (validated.status) updateData.status = validated.status;
    if (validated.fulfillmentStatus) updateData.fulfillment_status = validated.fulfillmentStatus;
    if (validated.paymentStatus) updateData.payment_status = validated.paymentStatus;
    if (validated.adminNotes) updateData.admin_notes = validated.adminNotes;
    if (validated.deliveryUrl) updateData.delivery_url = validated.deliveryUrl;

    // Set completion timestamp if status is completed
    if (validated.status === 'completed') {
      updateData.completed_at = new Date();
    }

    const [updatedOrder] = await db
      .update(customOrders)
      .set(updateData)
      .where(eq(customOrders.order_number, orderNumber))
      .returning();

    if (!updatedOrder) {
      throw OrderErrors.orderNotFound(orderNumber);
    }

    console.log(`[CUSTOM ORDER] Updated order ${orderNumber} status:`, updateData);

    res.json(successResponse({ order: updatedOrder }, 'Order updated successfully'));
  } catch (error) {
    logOrderError(error as Error, { 
      operation: 'update_order_status', 
      orderNumber: req.params.orderNumber,
      ...req.body 
    });
    handleOrderError(error, res);
  }
});

/**
 * POST /api/custom-orders/validate-discount
 * Validate a discount code
 */
router.post('/validate-discount', async (req, res) => {
  try {
    const validated = validateDiscountCodeSchema.parse(req.body);

    if (!db) {
      throw OrderErrors.databaseError('validating discount code');
    }

    const [discount] = await db
      .select()
      .from(discountCodes)
      .where(eq(discountCodes.code, validated.code))
      .limit(1);

    if (!discount) {
      throw OrderErrors.invalidDiscountCode(validated.code);
    }

    if (!discount.is_active) {
      throw OrderErrors.invalidDiscountCode(validated.code);
    }

    if (discount.valid_until && new Date(discount.valid_until) < new Date()) {
      throw OrderErrors.discountCodeExpired(validated.code, new Date(discount.valid_until));
    }

    if (discount.max_uses && discount.current_uses >= discount.max_uses) {
      throw OrderErrors.discountCodeMaxUses(validated.code);
    }

    // Calculate discount amount if order amount provided
    let discountAmount = 0;
    if (validated.orderAmount) {
      if (discount.min_order_amount && validated.orderAmount < parseFloat(discount.min_order_amount.toString())) {
        return res.status(400).json({
          error: {
            code: 'MIN_ORDER_NOT_MET',
            message: `This discount code requires a minimum order amount of $${discount.min_order_amount}`,
            details: { minAmount: discount.min_order_amount }
          }
        });
      }

      if (discount.discount_type === 'percentage') {
        discountAmount = (validated.orderAmount * parseFloat(discount.discount_value.toString())) / 100;
      } else {
        discountAmount = parseFloat(discount.discount_value.toString());
      }
    }

    res.json(successResponse({
      valid: true,
      discount: {
        code: discount.code,
        type: discount.discount_type,
        value: discount.discount_value,
        discountAmount,
        description: discount.description,
      }
    }, 'Discount code is valid'));

  } catch (error) {
    logOrderError(error as Error, { operation: 'validate_discount', ...req.body });
    handleOrderError(error, res);
  }
});

export default router;
