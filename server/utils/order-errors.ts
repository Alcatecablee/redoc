/**
 * Custom Order Error Handling
 * 
 * Provides specific, user-friendly error messages and proper error logging
 * for the Configure Your Project feature.
 */

import { z } from 'zod';

/**
 * Error codes for custom order operations
 */
export enum OrderErrorCode {
  // Validation errors (400)
  INVALID_URL = 'INVALID_URL',
  INVALID_EMAIL = 'INVALID_EMAIL',
  INVALID_CONFIGURATION = 'INVALID_CONFIGURATION',
  INVALID_DISCOUNT_CODE = 'INVALID_DISCOUNT_CODE',
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  
  // Not found errors (404)
  ORDER_NOT_FOUND = 'ORDER_NOT_FOUND',
  DISCOUNT_CODE_NOT_FOUND = 'DISCOUNT_CODE_NOT_FOUND',
  
  // Conflict errors (409)
  DUPLICATE_ORDER = 'DUPLICATE_ORDER',
  DISCOUNT_CODE_EXPIRED = 'DISCOUNT_CODE_EXPIRED',
  DISCOUNT_CODE_MAX_USES = 'DISCOUNT_CODE_MAX_USES',
  
  // Payment errors (402)
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAYMENT_CANCELLED = 'PAYMENT_CANCELLED',
  PRICE_MISMATCH = 'PRICE_MISMATCH',
  
  // Server errors (500)
  DATABASE_ERROR = 'DATABASE_ERROR',
  PAYMENT_PROVIDER_ERROR = 'PAYMENT_PROVIDER_ERROR',
  NOTIFICATION_ERROR = 'NOTIFICATION_ERROR',
}

/**
 * Custom error class for order operations
 */
export class OrderError extends Error {
  constructor(
    public code: OrderErrorCode,
    public message: string,
    public statusCode: number = 400,
    public details?: any
  ) {
    super(message);
    this.name = 'OrderError';
    Object.setPrototypeOf(this, OrderError.prototype);
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
      }
    };
  }
}

/**
 * Format Zod validation errors into user-friendly messages
 */
export function formatZodErrors(error: z.ZodError): { field: string; message: string }[] {
  return error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
  }));
}

/**
 * Create specific error instances with user-friendly messages
 */
export const OrderErrors = {
  invalidUrl: (url?: string) => new OrderError(
    OrderErrorCode.INVALID_URL,
    url
      ? `The URL "${url}" is invalid. Please provide a valid website URL starting with http:// or https://.`
      : 'Please provide a valid website URL starting with http:// or https://.',
    400,
    { url }
  ),

  invalidEmail: (email?: string) => new OrderError(
    OrderErrorCode.INVALID_EMAIL,
    email
      ? `The email address "${email}" is invalid. Please provide a valid email address.`
      : 'Please provide a valid email address.',
    400,
    { email }
  ),

  invalidConfiguration: (errors: any[]) => new OrderError(
    OrderErrorCode.INVALID_CONFIGURATION,
    'Your configuration has some issues. Please check the highlighted fields and try again.',
    400,
    { validationErrors: errors }
  ),

  invalidDiscountCode: (code: string) => new OrderError(
    OrderErrorCode.INVALID_DISCOUNT_CODE,
    `The discount code "${code}" is not valid. Please check the code and try again.`,
    400,
    { code }
  ),

  discountCodeExpired: (code: string, expiryDate?: Date) => new OrderError(
    OrderErrorCode.DISCOUNT_CODE_EXPIRED,
    expiryDate
      ? `The discount code "${code}" expired on ${expiryDate.toLocaleDateString()}. Please try a different code.`
      : `The discount code "${code}" has expired. Please try a different code.`,
    409,
    { code, expiryDate }
  ),

  discountCodeMaxUses: (code: string) => new OrderError(
    OrderErrorCode.DISCOUNT_CODE_MAX_USES,
    `The discount code "${code}" has reached its maximum number of uses. Please try a different code.`,
    409,
    { code }
  ),

  businessRuleViolation: (rule: string, message: string) => new OrderError(
    OrderErrorCode.BUSINESS_RULE_VIOLATION,
    message,
    400,
    { rule }
  ),

  orderNotFound: (orderNumber: string) => new OrderError(
    OrderErrorCode.ORDER_NOT_FOUND,
    `Order "${orderNumber}" could not be found. Please check the order number and try again.`,
    404,
    { orderNumber }
  ),

  duplicateOrder: (url: string) => new OrderError(
    OrderErrorCode.DUPLICATE_ORDER,
    `You already have a pending order for "${url}". Please complete or cancel that order before creating a new one.`,
    409,
    { url }
  ),

  paymentFailed: (reason?: string) => new OrderError(
    OrderErrorCode.PAYMENT_FAILED,
    reason
      ? `Payment failed: ${reason}. Please try again or use a different payment method.`
      : 'Payment failed. Please try again or use a different payment method.',
    402,
    { reason }
  ),

  paymentCancelled: () => new OrderError(
    OrderErrorCode.PAYMENT_CANCELLED,
    'Payment was cancelled. Your order has been saved and you can complete payment later.',
    400
  ),

  priceMismatch: (serverPrice: number, clientPrice: number, currency: string) => new OrderError(
    OrderErrorCode.PRICE_MISMATCH,
    `There was a price discrepancy. The calculated price (${currency} ${serverPrice}) does not match your quote (${currency} ${clientPrice}). Please refresh and try again.`,
    400,
    { serverPrice, clientPrice, currency }
  ),

  databaseError: (operation: string) => new OrderError(
    OrderErrorCode.DATABASE_ERROR,
    `We encountered a technical issue while ${operation}. Please try again in a moment.`,
    500,
    { operation }
  ),

  paymentProviderError: (error?: any) => new OrderError(
    OrderErrorCode.PAYMENT_PROVIDER_ERROR,
    'We encountered an issue with the payment provider. Please try again in a moment.',
    500,
    { originalError: error?.message }
  ),

  notificationError: () => new OrderError(
    OrderErrorCode.NOTIFICATION_ERROR,
    'Your order was created but we couldn\'t send notifications. We\'ll contact you via email shortly.',
    500
  ),
};

/**
 * Log error with context
 */
export function logOrderError(
  error: Error | OrderError,
  context: {
    operation: string;
    orderNumber?: string;
    email?: string;
    url?: string;
    [key: string]: any;
  }
): void {
  const timestamp = new Date().toISOString();
  const errorDetails = error instanceof OrderError ? error.toJSON() : { message: error.message, stack: error.stack };

  console.error(`[ORDER ERROR] ${timestamp}`, {
    operation: context.operation,
    orderNumber: context.orderNumber,
    email: context.email,
    url: context.url,
    error: errorDetails,
    context,
  });

  // TODO: Send to error tracking service (Sentry, etc.)
  // if (process.env.SENTRY_DSN) {
  //   Sentry.captureException(error, { contexts: { order: context } });
  // }
}

/**
 * Handle errors in route handlers
 */
export function handleOrderError(error: unknown, res: any): void {
  if (error instanceof OrderError) {
    res.status(error.statusCode).json(error.toJSON());
  } else if (error instanceof z.ZodError) {
    const validationErrors = formatZodErrors(error);
    res.status(400).json({
      error: {
        code: OrderErrorCode.INVALID_CONFIGURATION,
        message: 'Please check your input and try again.',
        details: { validationErrors },
      }
    });
  } else if (error instanceof Error) {
    // Generic error
    console.error('Unexpected error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred. Please try again later.',
      }
    });
  } else {
    // Unknown error type
    console.error('Unknown error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred. Please try again later.',
      }
    });
  }
}

/**
 * Validate and sanitize user input
 */
export function sanitizeOrderInput(data: any): any {
  return {
    ...data,
    // Trim all string fields
    url: typeof data.url === 'string' ? data.url.trim() : data.url,
    email: typeof data.email === 'string' ? data.email.trim().toLowerCase() : data.email,
    githubRepo: typeof data.githubRepo === 'string' ? data.githubRepo.trim() : data.githubRepo,
    customRequirements: typeof data.customRequirements === 'string' 
      ? data.customRequirements.trim() 
      : data.customRequirements,
    discountCode: typeof data.discountCode === 'string' 
      ? data.discountCode.trim().toUpperCase() 
      : data.discountCode,
  };
}

/**
 * Success response helper
 */
export function successResponse(data: any, message?: string) {
  return {
    success: true,
    message,
    data,
  };
}
