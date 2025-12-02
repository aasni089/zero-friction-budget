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
