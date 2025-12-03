'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Expense } from '@/lib/api/expense-client';

interface RecentExpensesProps {
  expenses: Expense[];
}

export function RecentExpenses({ expenses }: RecentExpensesProps) {
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (expenses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-gray-500">
            No expenses recorded yet
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Expenses</CardTitle>
        <p className="text-sm text-gray-500">Last {expenses.length} transactions</p>
      </CardHeader>
      <CardContent>
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-2 text-sm font-semibold text-gray-600">
                  Date
                </th>
                <th className="text-left py-3 px-2 text-sm font-semibold text-gray-600">
                  Description
                </th>
                <th className="text-left py-3 px-2 text-sm font-semibold text-gray-600">
                  Category
                </th>
                <th className="text-left py-3 px-2 text-sm font-semibold text-gray-600">
                  Budget
                </th>
                <th className="text-left py-3 px-2 text-sm font-semibold text-gray-600">
                  User
                </th>
                <th className="text-right py-3 px-2 text-sm font-semibold text-gray-600">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr key={expense.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-2 text-sm text-gray-600">
                    {formatDate(expense.date)}
                  </td>
                  <td className="py-3 px-2 text-sm">
                    {expense.description || 'No description'}
                  </td>
                  <td className="py-3 px-2 text-sm">
                    {expense.category ? (
                      <div className="flex items-center gap-2">
                        {expense.category.icon && (
                          <span className="text-base">{expense.category.icon}</span>
                        )}
                        <span>{expense.category.name}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">Uncategorized</span>
                    )}
                  </td>
                  <td className="py-3 px-2 text-sm text-gray-600">
                    {expense.budget?.name || <span className="text-gray-400">No budget</span>}
                  </td>
                  <td className="py-3 px-2 text-sm text-gray-600">
                    {expense.user?.name || 'Unknown'}
                  </td>
                  <td className="py-3 px-2 text-sm font-semibold text-right">
                    {formatCurrency(expense.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
          {expenses.map((expense) => (
            <div
              key={expense.id}
              className="border border-gray-200 rounded-lg p-4 space-y-2"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-semibold">{expense.description || 'No description'}</p>
                  <p className="text-sm text-gray-500">{formatDate(expense.date)}</p>
                </div>
                <p className="font-bold text-lg">{formatCurrency(expense.amount)}</p>
              </div>
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  {expense.category ? (
                    <>
                      {expense.category.icon && (
                        <span className="text-base">{expense.category.icon}</span>
                      )}
                      <span>{expense.category.name}</span>
                    </>
                  ) : (
                    <span className="text-gray-400">Uncategorized</span>
                  )}
                </div>
                <span className="text-gray-600">{expense.user?.name || 'Unknown'}</span>
              </div>
              {expense.budget && (
                <div className="text-xs text-gray-500">
                  Budget: <span className="font-medium">{expense.budget.name}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
