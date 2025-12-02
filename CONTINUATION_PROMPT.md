# Primary Budget Feature - Continuation Prompt

Use this prompt after clearing context to continue implementing the primary budget feature.

---

## Context

**Project**: Zero Friction Budget
**Repository**: ~/Documents/projects/zero_friction_budget
**Branch**: phase-3-frontend-development
**Backend**: Node.js + Express + Prisma (port 5000)
**Frontend**: Next.js 14 + TypeScript + Tailwind (port 3000)

## What Was Completed

1. ✅ **Prisma Schema Updated**:
   - Added `primaryBudgetId` field to Household model (unique, optional)
   - Added one-to-one relation between Household and Budget for primary budget
   - Migration created and run: `20251202183146_add_primary_budget_to_household`
   - Prisma client regenerated

2. ✅ **Git Commit Pushed**:
   - Commit: `783e0f3` - "feat: add primary budget schema and initial updates"
   - Changes pushed to `phase-3-frontend-development` branch

## Primary Budget Feature Requirements

**Goal**: Allow users to set a "primary budget" for each household with the following behavior:

1. **Setting Primary Budget**:
   - Use star icon (⭐) on budget cards to toggle primary status
   - Only ONE budget can be primary per household
   - First budget created auto-sets as primary

2. **Expense Page Integration**:
   - Show progress bars for ALL line items in the primary budget
   - Progress bars appear below the expense input form
   - Each line item shows: category name, icon, spent/allocated, percentage, color-coded bar

3. **Auto-select in Expense Form**:
   - Budget dropdown pre-selects the primary budget
   - User can change to another budget if needed

## Implementation Plan

**Complete implementation plan is in**: `PRIMARY_BUDGET_IMPLEMENTATION_PLAN.md`

Read this file for detailed step-by-step instructions including:
- Backend controller updates (6 steps)
- Frontend component updates (7 steps)
- Code snippets for each change
- Testing checklist

## Task

Implement the primary budget feature following the plan in `PRIMARY_BUDGET_IMPLEMENTATION_PLAN.md`.

**Start with**:
1. Backend controller updates (Steps 1-6)
2. Test backend endpoints
3. Frontend TypeScript interface updates (Step 1)
4. Frontend API client methods (Step 2)
5. UI components (Steps 3-7)
6. Test full feature end-to-end

**Important Files**:
- Backend: `backend/controllers/budget.js`, `backend/routes/budget.js`
- Frontend:
  - `frontend/lib/api/budget-client.ts`
  - `frontend/lib/api/household-client.ts`
  - `frontend/components/budget/BudgetCard.tsx`
  - `frontend/app/(dashboard)/budgets/page.tsx`
  - `frontend/app/(dashboard)/expense/page.tsx`
  - Create new: `frontend/components/budget/LineItemProgressBar.tsx`

## Current State

- Backend API running on port 5000
- Frontend running on port 3000
- Database migration completed
- Schema supports primary budget relationship
- Ready for controller logic and UI implementation

## Expected Result

After implementation:
- Users can click star icon on budget cards to set/unset primary budget
- Only one budget shows filled star at a time
- Expense page shows compact progress bars for primary budget's line items
- Budget dropdown in expense form defaults to primary budget
- All changes automatically sync across the household

---

**Start implementing by reading the detailed plan in `PRIMARY_BUDGET_IMPLEMENTATION_PLAN.md`**
