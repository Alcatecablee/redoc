import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const res = await fetch(queryKey[0] as string);
        if (!res.ok) {
          const error = await res.json().catch(() => ({ error: res.statusText }));
          throw new Error(error.error || "An error occurred");
        }
        return res.json();
      },
    },
  },
});

import { supabase } from '@/lib/supabaseClient';

export async function apiRequest(url: string, options?: RequestInit) {
  // Attach Supabase access token if available
  let token = undefined;
  try {
    const { data } = await supabase.auth.getSession();
    token = data?.session?.access_token;
  } catch (e) {
    // ignore
  }

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || "An error occurred");
  }

  return res.json();
}
