# Primary Budget Feature - Implementation Plan

## ✅ Completed
1. **Prisma Schema Updated**
   - Added `primaryBudgetId` field to Household model (unique, optional)
   - Added `primaryBudget` relation to Household
   - Added `primaryForHousehold` reverse relation to Budget
   - Migration created and run: `20251202183146_add_primary_budget_to_household`

2. **Prisma Client Generated**
   - New schema available in backend

## 🔨 Backend Implementation (To Do)

### Step 1: Update Budget Validation Schemas
**File**: `backend/controllers/budget.js`

1. Update `updateBudgetSchema` (around line 22):
```javascript
const updateBudgetSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  amount: z.number().positive().optional(),
  period: z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM']).optional(),
  startDate: z.string().datetime().or(z.date()).optional(),
  endDate: z.string().datetime().or(z.date()).optional().nullable(),
  categoryId: z.string().cuid().optional().nullable(),
  isPrimary: z.boolean().optional(), // ADD THIS LINE
});
```

### Step 2: Update createBudget Controller
**File**: `backend/controllers/budget.js`
**Function**: `exports.createBudget` (around line 110)

After creating the budget (around line 180), add:
```javascript
// Auto-set as primary if it's the first budget for the household
const budgetCount = await prisma.budget.count({
  where: { householdId: validatedData.householdId }
});

if (budgetCount === 1) {
  // This is the first budget, make it primary
  await prisma.household.update({
    where: { id: validatedData.householdId },
    data: { primaryBudgetId: createdBudget.id }
  });
}
```

### Step 3: Update updateBudget Controller
**File**: `backend/controllers/budget.js`
**Function**: `exports.updateBudget` (around line 420)

After line 489 (after handling categories), before the budget update (line 492), add:
```javascript
// Handle isPrimary flag
if (req.body.isPrimary === true) {
  // Update the household to set this budget as primary
  await prisma.household.update({
    where: { id: budget.householdId },
    data: { primaryBudgetId: id }
  });
} else if (req.body.isPrimary === false) {
  // Check if this budget is currently primary
  const household = await prisma.household.findUnique({
    where: { id: budget.householdId },
    select: { primaryBudgetId: true }
  });

  if (household?.primaryBudgetId === id) {
    // Unset primary budget
    await prisma.household.update({
      where: { id: budget.householdId },
      data: { primaryBudgetId: null }
    });
  }
}
```

### Step 4: Update getBudgets Response to Include isPrimary Flag
**File**: `backend/controllers/budget.js`
**Function**: `exports.getBudgets` (around line 150)

After fetching budgets (around line 195), before returning response:
```javascript
// Get household to check primary budget
const household = await prisma.household.findUnique({
  where: { id: householdId },
  select: { primaryBudgetId: true }
});

// Add isPrimary flag to each budget
const budgetsWithPrimary = budgets.map(budget => ({
  ...budget,
  isPrimary: household?.primaryBudgetId === budget.id
}));

// Return budgetsWithPrimary instead of budgets
```

### Step 5: Create Endpoint to Get Primary Budget
**File**: `backend/controllers/budget.js`

Add new controller function at the end:
```javascript
/**
 * @route   GET /budgets/primary
 * @desc    Get the primary budget for a household
 * @access  Private
 */
exports.getPrimaryBudget = async (req, res) => {
  try {
    const { householdId } = req.query;
    const userId = req.user.id;

    if (!householdId) {
      return res.status(400).json({
        success: false,
        error: { message: 'householdId is required' }
      });
    }

    // Verify user is a member
    const membership = await prisma.householdMember.findUnique({
      where: {
        householdId_userId: { householdId, userId }
      }
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        error: { message: 'Access denied' }
      });
    }

    // Get household with primary budget
    const household = await prisma.household.findUnique({
      where: { id: householdId },
      include: {
        primaryBudget: {
          include: {
            category: true,
            categories: {
              include: {
                category: {
                  select: {
                    id: true,
                    name: true,
                    icon: true,
                    color: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!household?.primaryBudget) {
      return res.json({
        success: true,
        data: null
      });
    }

    // Calculate progress for each line item
    const budgetWithProgress = {
      ...household.primaryBudget,
      isPrimary: true,
      lineItems: await Promise.all(
        household.primaryBudget.categories.map(async (lineItem) => {
          const expenses = await prisma.expense.findMany({
            where: {
              householdId,
              categoryId: lineItem.categoryId,
              type: 'EXPENSE'
            }
          });

          const spent = expenses.reduce((sum, e) => sum + e.amount, 0);
          const percentage = (spent / lineItem.allocatedAmount) * 100;

          return {
            ...lineItem,
            spent,
            remaining: lineItem.allocatedAmount - spent,
            percentage: Math.round(percentage * 100) / 100
          };
        })
      )
    };

    res.json({
      success: true,
      data: budgetWithProgress
    });
  } catch (error) {
    logger.error('Error getting primary budget:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get primary budget' }
    });
  }
};
```

### Step 6: Add Route for Primary Budget
**File**: `backend/routes/budget.js`

Add route before the `:id` routes:
```javascript
router.get('/primary', authenticateToken, budgetController.getPrimaryBudget);
```

---

## 🎨 Frontend Implementation (To Do)

### Step 1: Update TypeScript Interfaces
**File**: `frontend/lib/api/budget-client.ts`

Update Budget interface (around line 5):
```typescript
export interface Budget {
  id: string;
  name: string;
  amount: number;
  period: 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  startDate: string;
  endDate?: string;
  householdId: string;
  createdAt: string;
  updatedAt: string;
  isPrimary?: boolean; // ADD THIS
  categories?: BudgetCategory[];
  _count?: {
    expenses: number;
    categories: number;
  };
  progress?: {
    totalSpent: number;
    remaining: number;
    percentage: number;
    status: 'on_track' | 'warning' | 'over_budget';
  };
}
```

**File**: `frontend/lib/api/household-client.ts`

Update Household interface:
```typescript
export interface Household {
  id: string;
  name: string;
  ownerId: string;
  primaryBudgetId?: string | null; // ADD THIS
  createdAt: string;
  updatedAt: string;
  _count?: {
    members: number;
    budgets: number;
    expenses: number;
  };
}
```

### Step 2: Add Primary Budget API Client Method
**File**: `frontend/lib/api/budget-client.ts`

Add at the end:
```typescript
// Get primary budget for household
export async function getPrimaryBudget(householdId: string) {
  return api.get<Budget | null>(`/budgets/primary?householdId=${householdId}`);
}

// Set budget as primary
export async function setPrimaryBudget(budgetId: string, isPrimary: boolean) {
  return api.patch<Budget>(`/budgets/${budgetId}`, { isPrimary });
}
```

### Step 3: Add Star Icon to Budget Cards
**File**: `frontend/components/budget/BudgetCard.tsx`

1. Add import:
```typescript
import { Star } from 'lucide-react';
```

2. Add star icon button in the card header (around line 40):
```typescript
<div className="flex items-center justify-between">
  <h3 className="text-lg font-semibold">{budget.name}</h3>
  <button
    onClick={(e) => {
      e.stopPropagation();
      onTogglePrimary?.(budget.id, !budget.isPrimary);
    }}
    className="p-1 hover:bg-gray-100 rounded transition-colors"
    title={budget.isPrimary ? "Remove as primary budget" : "Set as primary budget"}
  >
    <Star
      className={`h-5 w-5 ${
        budget.isPrimary
          ? 'fill-yellow-400 text-yellow-400'
          : 'text-gray-400'
      }`}
    />
  </button>
</div>
```

3. Add prop to interface:
```typescript
interface BudgetCardProps {
  budget: Budget;
  onEdit?: (budget: Budget) => void;
  onDelete?: (budgetId: string) => void;
  onTogglePrimary?: (budgetId: string, isPrimary: boolean) => void; // ADD THIS
}
```

### Step 4: Implement Toggle Primary in Budgets Page
**File**: `frontend/app/(dashboard)/budgets/page.tsx`

1. Add import:
```typescript
import { setPrimaryBudget } from '@/lib/api/budget-client';
```

2. Add handler function (around line 50):
```typescript
const handleTogglePrimary = async (budgetId: string, isPrimary: boolean) => {
  try {
    await setPrimaryBudget(budgetId, isPrimary);
    toast.success(isPrimary ? 'Budget set as primary' : 'Primary budget removed');
    // Refetch budgets
    fetchBudgets();
  } catch (error) {
    console.error('Failed to toggle primary budget:', error);
    toast.error('Failed to update primary budget');
  }
};
```

3. Pass handler to BudgetCard:
```typescript
<BudgetCard
  budget={budget}
  onEdit={handleEditBudget}
  onDelete={handleDeleteBudget}
  onTogglePrimary={handleTogglePrimary}
/>
```

### Step 5: Create Line Item Progress Bar Component
**File**: `frontend/components/budget/LineItemProgressBar.tsx`

Create new file:
```typescript
'use client';

interface LineItemProgressBarProps {
  categoryName: string;
  categoryIcon?: string;
  allocated: number;
  spent: number;
  color?: string;
}

export function LineItemProgressBar({
  categoryName,
  categoryIcon,
  allocated,
  spent,
  color = '#3b82f6'
}: LineItemProgressBarProps) {
  const percentage = Math.min((spent / allocated) * 100, 100);
  const remaining = Math.max(allocated - spent, 0);

  // Determine color based on percentage
  let barColor = 'bg-green-500';
  if (percentage >= 90) {
    barColor = 'bg-red-500';
  } else if (percentage >= 70) {
    barColor = 'bg-yellow-500';
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="py-2">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          {categoryIcon && <span className="text-sm">{categoryIcon}</span>}
          <span className="text-sm font-medium text-gray-700">{categoryName}</span>
        </div>
        <span className="text-xs text-gray-500">
          {formatCurrency(spent)} / {formatCurrency(allocated)}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-xs text-gray-500">{percentage.toFixed(0)}% used</span>
        <span className="text-xs text-gray-500">
          {remaining > 0 ? `${formatCurrency(remaining)} left` : 'Over budget'}
        </span>
      </div>
    </div>
  );
}
```

### Step 6: Update Expense Page to Show Primary Budget Progress
**File**: `frontend/app/(dashboard)/expense/page.tsx`

1. Add imports:
```typescript
import { getPrimaryBudget } from '@/lib/api/budget-client';
import { LineItemProgressBar } from '@/components/budget/LineItemProgressBar';
```

2. Add state (around line 15):
```typescript
const [primaryBudget, setPrimaryBudget] = useState<any>(null);
const [loadingPrimaryBudget, setLoadingPrimaryBudget] = useState(true);
```

3. Add useEffect to fetch primary budget:
```typescript
useEffect(() => {
  const fetchPrimaryBudget = async () => {
    if (!currentHouseholdId) return;

    try {
      setLoadingPrimaryBudget(true);
      const budget = await getPrimaryBudget(currentHouseholdId);
      setPrimaryBudget(budget);
    } catch (error) {
      console.error('Failed to fetch primary budget:', error);
    } finally {
      setLoadingPrimaryBudget(false);
    }
  };

  fetchPrimaryBudget();
}, [currentHouseholdId]);
```

4. Add progress bars section in the render (after ExpenseInput component):
```typescript
{/* Primary Budget Progress */}
{!loadingPrimaryBudget && primaryBudget && primaryBudget.lineItems && (
  <div className="mt-6 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
    <h3 className="text-lg font-semibold mb-4">
      {primaryBudget.name} Progress
    </h3>
    <div className="space-y-3">
      {primaryBudget.lineItems.map((lineItem: any) => (
        <LineItemProgressBar
          key={lineItem.id}
          categoryName={lineItem.category.name}
          categoryIcon={lineItem.category.icon}
          allocated={lineItem.allocatedAmount}
          spent={lineItem.spent}
          color={lineItem.category.color}
        />
      ))}
    </div>
  </div>
)}
```

### Step 7: Auto-select Primary Budget in Expense Form
**File**: `frontend/components/expense/ExpenseInput.tsx`

1. Add prop to component:
```typescript
interface ExpenseInputProps {
  primaryBudgetId?: string; // ADD THIS
}
```

2. Use primaryBudgetId as default in the form (around line 30):
```typescript
const form = useForm({
  defaultValues: {
    amount: '',
    description: '',
    categoryId: '',
    budgetId: primaryBudgetId || '', // Use primary budget as default
    date: new Date(),
  }
});
```

3. Update prop in expense page:
```typescript
<ExpenseInput primaryBudgetId={primaryBudget?.id} />
```

---

## ✅ Testing Checklist

### Backend Tests
- [ ] Create a budget → Should auto-set as primary if first budget
- [ ] Update budget with `isPrimary: true` → Should set as primary
- [ ] Update budget with `isPrimary: false` → Should remove primary status
- [ ] GET `/budgets` → Should include `isPrimary` flag
- [ ] GET `/budgets/primary` → Should return primary budget with line items and progress

### Frontend Tests
- [ ] Star icon appears on budget cards
- [ ] Clicking star toggles primary status
- [ ] Only one budget can be primary (star fills for one only)
- [ ] Expense page shows primary budget line item progress bars
- [ ] Progress bars show correct colors (green/yellow/red based on usage)
- [ ] Expense form pre-selects primary budget
- [ ] When no primary budget exists, no progress bars show

---

## 📝 Notes

- Primary budget is optional (household can have no primary budget)
- Only one budget can be primary per household (enforced by unique constraint)
- Auto-sets first budget as primary for better UX
- Progress bars show real-time spending vs allocated amounts for each category
- Star icon UI pattern is intuitive and commonly used
