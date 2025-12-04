// Zustand store for UI state (sidebar, current household, etc.)

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Household } from '../api/household-client';

interface UiState {
  // Sidebar state
  sidebarCollapsed: boolean;
  sidebarOpen: boolean; // For mobile drawer

  // Household selection
  currentHouseholdId: string | null;
  households: Household[];
  householdsLoading: boolean;

  // Categories
  categories: any[]; // Category[]
  categoriesLoading: boolean;
  setCategories: (categories: any[]) => void;
  setCategoriesLoading: (loading: boolean) => void;

  // Budget management
  budgets: any[];
  budgetsLoading: boolean;

  // Actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
  setCurrentHouseholdId: (householdId: string | null) => void;
  setHouseholds: (households: Household[]) => void;
  setHouseholdsLoading: (loading: boolean) => void;
  getCurrentHousehold: () => Household | null;
  setBudgets: (budgets: any[]) => void;
  updateBudget: (budgetId: string, updates: any) => void;
  deleteBudget: (budgetId: string) => void;
  setBudgetsLoading: (loading: boolean) => void;
  clearBudgets: () => void;

  // Global refresh trigger
  refreshKey: number;
  triggerRefresh: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      // Initial state
      sidebarCollapsed: false,
      sidebarOpen: false,
      currentHouseholdId: null,
      households: [],
      householdsLoading: false,
      budgets: [],
      budgetsLoading: false,
      categories: [],
      categoriesLoading: false,

      // Sidebar actions
      toggleSidebar: () => set((state) => ({
        sidebarCollapsed: !state.sidebarCollapsed
      })),

      setSidebarCollapsed: (collapsed) => set({
        sidebarCollapsed: collapsed
      }),

      setSidebarOpen: (open) => set({
        sidebarOpen: open
      }),

      // Household actions
      setCurrentHouseholdId: (householdId) => {
        const currentId = get().currentHouseholdId;
        // Clear budgets and categories when household changes
        if (householdId !== currentId) {
          set({
            currentHouseholdId: householdId,
            budgets: [],
            budgetsLoading: false,
            categories: [],
            categoriesLoading: false
          });
        } else {
          set({ currentHouseholdId: householdId });
        }
      },

      setHouseholds: (households) => {
        const state = get();
        const newState: Partial<UiState> = { households };

        // If no current household is set, set the first one
        if (!state.currentHouseholdId && households.length > 0) {
          newState.currentHouseholdId = households[0].id;
        }

        // If current household is set but not in the new list, reset to first
        if (
          state.currentHouseholdId &&
          !households.find((h) => h.id === state.currentHouseholdId)
        ) {
          newState.currentHouseholdId = households.length > 0 ? households[0].id : null;
        }

        set(newState);
      },

      setHouseholdsLoading: (loading) => set({ householdsLoading: loading }),

      getCurrentHousehold: () => {
        const state = get();
        return state.households.find((h) => h.id === state.currentHouseholdId) || null;
      },

      // Budget actions
      setBudgets: (budgets) => set({ budgets }),

      updateBudget: (budgetId, updates) => set((state) => ({
        budgets: state.budgets.map((b) =>
          b.id === budgetId ? { ...b, ...updates } : b
        )
      })),

      deleteBudget: (budgetId) => set((state) => ({
        budgets: state.budgets.filter((b) => b.id !== budgetId)
      })),

      setBudgetsLoading: (loading) => set({ budgetsLoading: loading }),

      clearBudgets: () => set({ budgets: [], budgetsLoading: false }),

      // Category actions
      setCategories: (categories) => set({ categories }),
      setCategoriesLoading: (loading) => set({ categoriesLoading: loading }),

      // Global refresh trigger
      refreshKey: 0,
      triggerRefresh: () => set((state) => ({ refreshKey: state.refreshKey + 1 })),
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        currentHouseholdId: state.currentHouseholdId,
      }),
    }
  )
);
