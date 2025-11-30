// Zustand store for UI state (sidebar, current household, etc.)

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UiState {
  sidebarCollapsed: boolean;
  currentHouseholdId: string | null;

  // Actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setCurrentHouseholdId: (householdId: string | null) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      currentHouseholdId: null,

      toggleSidebar: () => set((state) => ({
        sidebarCollapsed: !state.sidebarCollapsed
      })),

      setSidebarCollapsed: (collapsed) => set({
        sidebarCollapsed: collapsed
      }),

      setCurrentHouseholdId: (householdId) => set({
        currentHouseholdId: householdId
      }),
    }),
    {
      name: 'ui-storage',
    }
  )
);
