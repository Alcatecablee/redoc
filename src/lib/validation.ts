import { z } from 'zod';

export const urlSchema = z.string()
  .min(1, "URL is required")
  .url("Please enter a valid URL")
  .refine((url) => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }, "URL must use HTTP or HTTPS protocol")
  .refine((url) => {
    try {
      const parsed = new URL(url);
      // Check for common localhost patterns
      const isLocalhost = parsed.hostname === 'localhost' || 
                         parsed.hostname === '127.0.0.1' ||
                         parsed.hostname.endsWith('.local') ||
                         parsed.hostname.startsWith('192.168.') ||
                         parsed.hostname.startsWith('10.') ||
                         (parsed.hostname.startsWith('172.') && 
                          parseInt(parsed.hostname.split('.')[1]) >= 16 && 
                          parseInt(parsed.hostname.split('.')[1]) <= 31);
      
      return !isLocalhost;
    } catch {
      return true; // If we can't parse it, let the URL validation handle it
    }
  }, "Local URLs are not supported. Please use a publicly accessible URL");

export function validateUrl(url: string): { isValid: boolean; error?: string } {
  try {
    urlSchema.parse(url);
    return { isValid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, error: error.errors[0]?.message || "Invalid URL" };
    }
    return { isValid: false, error: "Invalid URL" };
  }
}

export const emailSchema = z.string()
  .min(1, "Email is required")
  .email("Please enter a valid email address");

export function validateEmail(email: string): { isValid: boolean; error?: string } {
  try {
    emailSchema.parse(email);
    return { isValid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, error: error.errors[0]?.message || "Invalid email" };
    }
    return { isValid: false, error: "Invalid email" };
  }
}