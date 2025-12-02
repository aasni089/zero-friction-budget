'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MonthSelectorProps {
  selectedMonth: string; // Format: YYYY-MM
  onMonthChange: (month: string) => void;
}

export function MonthSelector({ selectedMonth, onMonthChange }: MonthSelectorProps) {
  const [year, month] = selectedMonth.split('-').map(Number);

  // Format month name
  const monthName = new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  // Check if current month
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const isCurrentMonth = selectedMonth === currentMonth;

  // Handle previous month
  const handlePreviousMonth = () => {
    let newMonth = month - 1;
    let newYear = year;

    if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }

    const newMonthString = `${newYear}-${String(newMonth).padStart(2, '0')}`;
    onMonthChange(newMonthString);
  };

  // Handle next month
  const handleNextMonth = () => {
    let newMonth = month + 1;
    let newYear = year;

    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    }

    const newMonthString = `${newYear}-${String(newMonth).padStart(2, '0')}`;
    onMonthChange(newMonthString);
  };

  // Handle current month
  const handleCurrentMonth = () => {
    onMonthChange(currentMonth);
  };

  return (
    <div className="flex items-center justify-between gap-4">
      <Button
        variant="outline"
        size="sm"
        onClick={handlePreviousMonth}
        className="h-9 w-9 p-0"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="flex items-center gap-2">
        <h2 className="text-2xl font-bold">{monthName}</h2>
        {!isCurrentMonth && (
          <Button variant="ghost" size="sm" onClick={handleCurrentMonth}>
            Today
          </Button>
        )}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={handleNextMonth}
        className="h-9 w-9 p-0"
        disabled={isCurrentMonth}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
