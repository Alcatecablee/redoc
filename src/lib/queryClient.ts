import { QueryClient } from "@tanstack/react-query";
import { supabase } from '@/lib/supabaseClient';

/**
 * apiRequest: wraps fetch to attach Supabase access token and normalize API URL.
 * - If url starts with "/api" or "/", it will be prefixed with window.location.origin.
 * - If fetch fails due to network/CORS, a descriptive Error is thrown.
 */
export async function apiRequest(url: string, options?: RequestInit) {
  // Normalize URL to absolute
  let fetchUrl = url;
  try {
    if (typeof window !== 'undefined') {
      if (url.startsWith('/')) {
        fetchUrl = `${window.location.origin}${url}`;
      }
    }
  } catch (e) {
    // ignore - fallback to provided url
  }

  // Attach Supabase access token if available
  let token: string | undefined = undefined;
  try {
    const { data } = await supabase.auth.getSession();
    token = data?.session?.access_token as string | undefined;
  } catch (e) {
    // ignore
  }

  try {
    const res = await fetch(fetchUrl, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
    });

    if (!res.ok) {
      // Try parse json error, fallback to text
      const errorBody = await res.text().catch(() => res.statusText);
      let message = res.statusText;
      try {
        const parsed = JSON.parse(errorBody as string);
        message = parsed.error || parsed.message || JSON.stringify(parsed);
      } catch (e) {
        message = String(errorBody);
      }
      throw new Error(`Request failed (${res.status}): ${message}`);
    }

    // Try to return JSON, otherwise return text
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      return res.json();
    }
    return res.text();
  } catch (err: any) {
    // Network or CORS error
    const message = err?.message || String(err);
    throw new Error(`Network request failed: ${message}`);
  }
}

/**
 * Fetch a binary response (Blob) and attach Supabase auth token when available.
 */
export async function apiRequestBlob(url: string, options?: RequestInit) {
  let fetchUrl = url;
  try {
    if (typeof window !== 'undefined') {
      if (url.startsWith('/')) {
        fetchUrl = `${window.location.origin}${url}`;
      }
    }
  } catch (e) {}

  let token: string | undefined = undefined;
  try {
    const { data } = await supabase.auth.getSession();
    token = data?.session?.access_token as string | undefined;
  } catch (e) {}

  try {
    const res = await fetch(fetchUrl, {
      ...options,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
    });

    if (!res.ok) {
      const errorBody = await res.text().catch(() => res.statusText);
      let message = res.statusText;
      try {
        const parsed = JSON.parse(errorBody as string);
        message = parsed.error || parsed.message || JSON.stringify(parsed);
      } catch (e) {
        message = String(errorBody);
      }
      throw new Error(`Request failed (${res.status}): ${message}`);
    }

    const blob = await res.blob();
    return blob;
  } catch (err: any) {
    const message = err?.message || String(err);
    throw new Error(`Network request failed: ${message}`);
  }
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const url = queryKey[0] as string;
        return apiRequest(url);
      },
      retry: false,
    },
  },
});
