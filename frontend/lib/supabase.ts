// Supabase client for real-time features

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Subscribe to household channel for real-time updates
 */
export function subscribeToHousehold(
  householdId: string,
  handlers: {
    onExpenseCreated?: (payload: any) => void;
    onExpenseUpdated?: (payload: any) => void;
    onExpenseDeleted?: (payload: any) => void;
    onBudgetUpdated?: (payload: any) => void;
  }
) {
  if (!supabase) {
    console.warn('Supabase not configured, real-time features disabled');
    return null;
  }

  const channel = supabase.channel(`household:${householdId}`);

  if (handlers.onExpenseCreated) {
    channel.on('broadcast', { event: 'expense:created' }, ({ payload }) => {
      handlers.onExpenseCreated!(payload);
    });
  }

  if (handlers.onExpenseUpdated) {
    channel.on('broadcast', { event: 'expense:updated' }, ({ payload }) => {
      handlers.onExpenseUpdated!(payload);
    });
  }

  if (handlers.onExpenseDeleted) {
    channel.on('broadcast', { event: 'expense:deleted' }, ({ payload }) => {
      handlers.onExpenseDeleted!(payload);
    });
  }

  if (handlers.onBudgetUpdated) {
    channel.on('broadcast', { event: 'budget:updated' }, ({ payload }) => {
      handlers.onBudgetUpdated!(payload);
    });
  }

  channel.subscribe();

  return channel;
}
