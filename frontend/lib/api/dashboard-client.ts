// Dashboard API client for Zero Friction Budget

import { api } from './client';

export interface MonthlySummaryResponse {
  period: {
    month: number;
    year: number;
    startDate: string;
    endDate: string;
    daysElapsed: number;
    totalDays: number;
  };
  summary: {
    totalExpenses: number;
    totalIncome: number;
    net: number;
    totalBudgetAmount: number;
    budgetSpent: number;
    budgetRemaining: number;
    budgetUsagePercentage: number;
  };
  categoryBreakdown: {
    all: CategorySpending[];
    top5: CategorySpending[];
  };
  memberContributions: MemberContribution[];
  trends: {
    dailyBreakdown: DailySpending[];
    weekOverWeek: WeeklySpending[];
    projectedSpending: number;
  };
}

export interface CategorySpending {
  id: string;
  name: string;
  total: number;
  count: number;
  percentage: number;
  budgetAmount: number | null;
}

export interface MemberContribution {
  userId: string;
  name: string;
  email: string;
  total: number;
  percentage: number;
}

export interface DailySpending {
  date: string;
  total: number;
}

export interface WeeklySpending {
  weekNumber: number;
  total: number;
  days: number;
}

export interface BudgetHealth {
  budgets: BudgetHealthItem[];
  summary: {
    total: number;
    onTrack: number;
    warning: number;
    overBudget: number;
  };
  grouped: {
    ON_TRACK: BudgetHealthItem[];
    WARNING: BudgetHealthItem[];
    OVER_BUDGET: BudgetHealthItem[];
  };
}

export interface BudgetHealthItem {
  id: string;
  name: string;
  amount: number;
  period: string;
  startDate: string;
  endDate: string | null;
  category: {
    id: string;
    name: string;
  } | null;
  spent: number;
  remaining: number;
  percentage: number;
  healthStatus: 'ON_TRACK' | 'WARNING' | 'OVER_BUDGET';
  daysRemaining: number | null;
  projectedSpending: number | null;
}

/**
 * Get monthly summary with trends, category breakdown, and member contributions
 */
export async function getMonthlySummary(
  householdId: string,
  month?: string // Format: YYYY-MM
): Promise<MonthlySummaryResponse> {
  const params = new URLSearchParams({ householdId });
  if (month) {
    params.append('month', month);
  }
  return api.get<MonthlySummaryResponse>(`/dashboard/monthly?${params.toString()}`);
}

/**
 * Get budget health indicators for all active budgets
 */
export async function getBudgetHealth(householdId: string): Promise<BudgetHealth> {
  return api.get<BudgetHealth>(`/dashboard/budget-health?householdId=${householdId}`);
}
