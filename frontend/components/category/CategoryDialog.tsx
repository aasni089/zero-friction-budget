'use client';

import { useState, useEffect } from 'react';
import { useUiStore } from '@/lib/stores/ui';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { CreateCategoryData, UpdateCategoryData, Category } from '@/lib/api/category-client';

interface CategoryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    categoryToEdit?: Category;
    onSubmit: (data: CreateCategoryData | UpdateCategoryData) => Promise<void>;
}

const PREDEFINED_COLORS = [
    '#EF4444', // Red
    '#F97316', // Orange
    '#F59E0B', // Amber
    '#EAB308', // Yellow
    '#84CC16', // Lime
    '#22C55E', // Green
    '#10B981', // Emerald
    '#14B8A6', // Teal
    '#06B6D4', // Cyan
    '#0EA5E9', // Sky
    '#3B82F6', // Blue
    '#6366F1', // Indigo
    '#8B5CF6', // Violet
    '#A855F7', // Purple
    '#D946EF', // Fuchsia
    '#EC4899', // Pink
    '#F43F5E', // Rose
    '#64748B', // Slate
];

const COMMON_ICONS = [
    '🏠', '🛒', '🚗', '🍔', '💡', '🎮', '💊', '✈️', '🎓', '🎁',
    '🐾', '🏋️', '🎬', '📚', '🔧', '💼', '👶', '💰', '📱', '💻'
];

export function CategoryDialog({
    open,
    onOpenChange,
    categoryToEdit,
    onSubmit,
}: CategoryDialogProps) {
    const { currentHouseholdId } = useUiStore();

    // Form state
    const [name, setName] = useState('');
    const [icon, setIcon] = useState('💰');
    const [color, setColor] = useState(PREDEFINED_COLORS[0]);

    // UI state
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Populate form when editing
    useEffect(() => {
        if (open && categoryToEdit) {
            setName(categoryToEdit.name);
            setIcon(categoryToEdit.icon || '💰');
            setColor(categoryToEdit.color || PREDEFINED_COLORS[0]);
        } else if (open && !categoryToEdit) {
            // Reset form for new category
            setName('');
            setIcon('💰');
            setColor(PREDEFINED_COLORS[Math.floor(Math.random() * PREDEFINED_COLORS.length)]);
        }
    }, [open, categoryToEdit]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!currentHouseholdId) return;

        if (!name.trim()) {
            toast.error('Please enter a category name');
            return;
        }

        try {
            setIsSubmitting(true);

            const data: any = {
                name,
                icon,
                color,
            };

            if (!categoryToEdit) {
                data.householdId = currentHouseholdId;
            }

            await onSubmit(data);
            onOpenChange(false);
        } catch (error) {
            console.error('Failed to submit category:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>
                        {categoryToEdit ? 'Edit Category' : 'New Category'}
                    </DialogTitle>
                    <DialogDescription>
                        {categoryToEdit
                            ? 'Update category details.'
                            : 'Create a new category to organize your expenses.'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 py-4">
                    {/* Preview */}
                    <div className="flex justify-center mb-6">
                        <div
                            className="flex flex-col items-center justify-center w-24 h-24 rounded-2xl shadow-sm border border-border/50 transition-all"
                            style={{ backgroundColor: `${color}20` }}
                        >
                            <span className="text-4xl mb-1">{icon}</span>
                            <span
                                className="text-xs font-medium truncate max-w-[80px]"
                                style={{ color: color }}
                            >
                                {name || 'Name'}
                            </span>
                        </div>
                    </div>

                    {/* Name */}
                    <div className="space-y-2">
                        <Label htmlFor="name">
                            Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="name"
                            placeholder="e.g. Groceries"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    {/* Icon Selection */}
                    <div className="space-y-2">
                        <Label>Icon</Label>
                        <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-muted/20 max-h-[120px] overflow-y-auto">
                            {COMMON_ICONS.map((emoji) => (
                                <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => setIcon(emoji)}
                                    className={cn(
                                        "w-8 h-8 flex items-center justify-center rounded-md text-lg transition-all hover:bg-muted hover:scale-110",
                                        icon === emoji && "bg-primary/20 ring-2 ring-primary ring-offset-1"
                                    )}
                                >
                                    {emoji}
                                </button>
                            ))}
                            <div className="w-full pt-2 border-t mt-1">
                                <Input
                                    placeholder="Or type any emoji..."
                                    value={icon}
                                    onChange={(e) => setIcon(e.target.value)}
                                    className="h-8 text-center"
                                    maxLength={2}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Color Selection */}
                    <div className="space-y-2">
                        <Label>Color</Label>
                        <div className="flex flex-wrap gap-3">
                            {PREDEFINED_COLORS.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setColor(c)}
                                    className={cn(
                                        "w-6 h-6 rounded-full transition-all hover:scale-110",
                                        color === c && "ring-2 ring-offset-2 ring-primary scale-110"
                                    )}
                                    style={{ backgroundColor: c }}
                                    aria-label={`Select color ${c}`}
                                />
                            ))}
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
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {categoryToEdit ? 'Save Changes' : 'Create Category'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
