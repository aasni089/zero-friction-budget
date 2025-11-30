const supabase = require('../config/supabase');

/**
 * Real-time Broadcast Service
 *
 * Uses Supabase Realtime to broadcast events to household members.
 * Each household has its own channel: household:${householdId}
 *
 * Events:
 * - expense:created - New expense added
 * - expense:updated - Expense modified
 * - expense:deleted - Expense removed
 * - budget:updated - Budget created/updated/deleted
 */

/**
 * Broadcasts an expense creation event to all household members
 * @param {number} householdId - The household ID
 * @param {Object} expense - The created expense object
 * @returns {Promise<boolean>} - Success status
 */
async function broadcastExpenseCreated(householdId, expense) {
  if (!supabase) {
    console.warn('⚠️  Supabase not configured. Skipping real-time broadcast for expense:created');
    return false;
  }

  try {
    const channel = supabase.channel(`household:${householdId}`);

    await channel.send({
      type: 'broadcast',
      event: 'expense:created',
      payload: {
        householdId,
        expense,
        timestamp: new Date().toISOString()
      }
    });

    console.log(`✓ Broadcasted expense:created to household:${householdId}`);
    return true;
  } catch (error) {
    console.error(`✗ Failed to broadcast expense:created to household:${householdId}:`, error.message);
    return false;
  }
}

/**
 * Broadcasts an expense update event to all household members
 * @param {number} householdId - The household ID
 * @param {Object} expense - The updated expense object
 * @returns {Promise<boolean>} - Success status
 */
async function broadcastExpenseUpdated(householdId, expense) {
  if (!supabase) {
    console.warn('⚠️  Supabase not configured. Skipping real-time broadcast for expense:updated');
    return false;
  }

  try {
    const channel = supabase.channel(`household:${householdId}`);

    await channel.send({
      type: 'broadcast',
      event: 'expense:updated',
      payload: {
        householdId,
        expense,
        timestamp: new Date().toISOString()
      }
    });

    console.log(`✓ Broadcasted expense:updated to household:${householdId}`);
    return true;
  } catch (error) {
    console.error(`✗ Failed to broadcast expense:updated to household:${householdId}:`, error.message);
    return false;
  }
}

/**
 * Broadcasts an expense deletion event to all household members
 * @param {number} householdId - The household ID
 * @param {number} expenseId - The ID of the deleted expense
 * @returns {Promise<boolean>} - Success status
 */
async function broadcastExpenseDeleted(householdId, expenseId) {
  if (!supabase) {
    console.warn('⚠️  Supabase not configured. Skipping real-time broadcast for expense:deleted');
    return false;
  }

  try {
    const channel = supabase.channel(`household:${householdId}`);

    await channel.send({
      type: 'broadcast',
      event: 'expense:deleted',
      payload: {
        householdId,
        expenseId,
        timestamp: new Date().toISOString()
      }
    });

    console.log(`✓ Broadcasted expense:deleted to household:${householdId}`);
    return true;
  } catch (error) {
    console.error(`✗ Failed to broadcast expense:deleted to household:${householdId}:`, error.message);
    return false;
  }
}

/**
 * Broadcasts a budget update event to all household members
 * @param {number} householdId - The household ID
 * @param {Object} budget - The updated budget object
 * @param {string} action - The action performed (created, updated, deleted)
 * @returns {Promise<boolean>} - Success status
 */
async function broadcastBudgetUpdated(householdId, budget, action = 'updated') {
  if (!supabase) {
    console.warn('⚠️  Supabase not configured. Skipping real-time broadcast for budget:updated');
    return false;
  }

  try {
    const channel = supabase.channel(`household:${householdId}`);

    await channel.send({
      type: 'broadcast',
      event: 'budget:updated',
      payload: {
        householdId,
        budget,
        action, // created, updated, or deleted
        timestamp: new Date().toISOString()
      }
    });

    console.log(`✓ Broadcasted budget:updated (${action}) to household:${householdId}`);
    return true;
  } catch (error) {
    console.error(`✗ Failed to broadcast budget:updated to household:${householdId}:`, error.message);
    return false;
  }
}

module.exports = {
  broadcastExpenseCreated,
  broadcastExpenseUpdated,
  broadcastExpenseDeleted,
  broadcastBudgetUpdated
};
