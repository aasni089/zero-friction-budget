'use client';

import { useState } from 'react';
import { useUiStore } from '@/lib/stores/ui';
import { createHousehold, getHouseholds } from '@/lib/api/household-client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface CreateHouseholdDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateHouseholdDialog({
  open,
  onOpenChange,
}: CreateHouseholdDialogProps) {
  const { setHouseholds, setCurrentHouseholdId } = useUiStore();
  const [householdName, setHouseholdName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!householdName.trim()) {
      toast.error('Please enter a household name');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await createHousehold({ name: householdName.trim() });

      toast.success(`Household "${response.name}" created!`);

      // Refetch households to get updated list
      const householdsResponse = await getHouseholds();
      setHouseholds(householdsResponse || []);

      // Automatically select the newly created household
      setCurrentHouseholdId(response.id);

      // Close dialog and reset form
      onOpenChange(false);
      setHouseholdName('');

      // No need for router.refresh() - Zustand store update triggers re-render
    } catch (error: any) {
      console.error('Failed to create household:', error);
      toast.error(error?.message || 'Failed to create household');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Household</DialogTitle>
          <DialogDescription>
            Create a household to start tracking expenses together.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="household-name">Household Name</Label>
              <Input
                id="household-name"
                placeholder="e.g., Smith Family, Roommates, Personal"
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                disabled={isSubmitting}
                autoFocus
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !householdName.trim()}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Household'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
