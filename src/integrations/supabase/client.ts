/**
 * Mock Supabase Client
 * 
 * This is a mock implementation to replace Supabase.
 * Use the backend API endpoints for all database operations.
 */

export const supabase = {
  auth: {
    getSession: async () => {
      return {
        data: {
          session: {
            user: {
              id: 'dev-user',
              email: 'dev@example.com',
            },
          },
        },
        error: null,
      };
    },
    signInWithOAuth: async () => {
      console.warn('[AUTH] OAuth sign-in is not implemented yet');
      return { data: { user: null, session: null }, error: { message: 'Auth not implemented' } };
    },
    signOut: async () => {
      console.log('[AUTH] Sign out called');
      return { error: null };
    },
    onAuthStateChange: (callback: any) => {
      // Immediately call with a mock session
      setTimeout(() => {
        callback('SIGNED_IN', {
          user: {
            id: 'dev-user',
            email: 'dev@example.com',
          },
        });
      }, 0);
      
      return {
        data: { subscription: { unsubscribe: () => {} } },
      };
    },
  },
  from: (table: string) => ({
    select: () => ({
      data: [],
      error: null,
    }),
  }),
};
