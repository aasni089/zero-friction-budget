'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PiggyBank, Plus, Users } from 'lucide-react';
import { CreateHouseholdDialog } from '@/components/household/CreateHouseholdDialog';

interface EmptyStateProps {
  type: 'household' | 'budget';
}

export function EmptyState({ type }: EmptyStateProps) {
  const router = useRouter();
  const [showHouseholdDialog, setShowHouseholdDialog] = useState(false);

  const handleCreateBudget = () => {
    router.push('/budgets?action=create');
  };

  const handleCreateHousehold = () => {
    setShowHouseholdDialog(true);
  };

  if (type === 'household') {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="max-w-md w-full text-center space-y-6">
            {/* Icon */}
            <div className="flex justify-center">
              <div className="rounded-full bg-blue-50 p-6">
                <Users className="h-16 w-16 text-blue-600" />
              </div>
            </div>

            {/* Heading */}
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-gray-900">
                Create Your First Household
              </h1>
              <p className="text-lg text-gray-600">
                A household helps you track expenses together with family or roommates
              </p>
            </div>

            {/* Action Button */}
            <div className="pt-4">
              <Button
                onClick={handleCreateHousehold}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create Household
              </Button>
            </div>

            {/* Secondary Text */}
            <p className="text-sm text-gray-500 pt-2">
              You can always create additional households or invite members later
            </p>
          </div>
        </div>

        <CreateHouseholdDialog
          open={showHouseholdDialog}
          onOpenChange={setShowHouseholdDialog}
        />
      </>
    );
  }

  // Budget empty state
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="rounded-full bg-blue-50 p-6">
            <PiggyBank className="h-16 w-16 text-blue-600" />
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">
            Create Your First Budget
          </h1>
          <p className="text-lg text-gray-600">
            Start tracking expenses by setting up a budget for your household
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-4">
          <Button
            onClick={handleCreateBudget}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Budget
          </Button>
        </div>

        {/* Secondary Text */}
        <p className="text-sm text-gray-500 pt-2">
          Budgets help you track spending and stay on top of your finances
        </p>
      </div>
    </div>
  );
}
