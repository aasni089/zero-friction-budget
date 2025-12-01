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

  // Actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
  setCurrentHouseholdId: (householdId: string | null) => void;
  setHouseholds: (households: Household[]) => void;
  getCurrentHousehold: () => Household | null;
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      // Initial state
      sidebarCollapsed: false,
      sidebarOpen: false,
      currentHouseholdId: null,
      households: [],

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
      setCurrentHouseholdId: (householdId) => set({
        currentHouseholdId: householdId
      }),

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

      getCurrentHousehold: () => {
        const state = get();
        return state.households.find((h) => h.id === state.currentHouseholdId) || null;
      },
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
