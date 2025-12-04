'use client';

import { useState, useEffect } from 'react';
import { useUiStore } from '@/lib/stores/ui';
import {
    getCategories,
    deleteCategory,
    updateCategory,
    createCategory,
    type Category,
    type CreateCategoryData,
    type UpdateCategoryData
} from '@/lib/api/category-client';
import { CategoryDialog } from './CategoryDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useRouter } from 'next/navigation';
import { Loader2, MoreHorizontal, Plus, RefreshCw, Tags, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

/**
 * CategoryList Component
 *
 * Displays and manages household-level categories.
 * These categories can be used across all budgets in the household.
 * For budget-specific categories, see CreateBudgetDialog and EditBudgetDialog.
 */
export function CategoryList() {
    const {
        currentHouseholdId,
        categories: storeCategories,
        setCategories: setStoreCategories,
        categoriesLoading: storeCategoriesLoading,
        setCategoriesLoading: setStoreCategoriesLoading
    } = useUiStore();

    // Use store state
    const categories = storeCategories;
    const isLoading = storeCategoriesLoading;

    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | undefined>(undefined);
    const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);

    const fetchCategories = async () => {
        if (!currentHouseholdId) return;

        // If we already have categories, don't re-fetch unless forced (e.g. by a refresh key, but here we just check length)
        // Actually, for the main list, we might want to ensure freshness, but let's stick to the caching strategy.
        if (storeCategories.length > 0) return;

        try {
            setStoreCategoriesLoading(true);
            // Fetch only household-level categories (no budgetId parameter)
            const response = await getCategories(currentHouseholdId);
            setStoreCategories(response.categories || []);
        } catch (error) {
            console.error('Failed to fetch categories:', error);
            toast.error('Failed to load categories');
        } finally {
            setStoreCategoriesLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, [currentHouseholdId, storeCategories.length, setStoreCategories, setStoreCategoriesLoading]);

    const handleCreate = async (data: CreateCategoryData | UpdateCategoryData) => {
        if (!currentHouseholdId) {
            toast.error('No household selected');
            return;
        }

        try {
            // Create household-level category (budgetId will be null)
            const createData = { ...(data as CreateCategoryData), householdId: currentHouseholdId };
            const newCategory = await createCategory(createData);

            // Update store
            setStoreCategories([...storeCategories, newCategory]);
            toast.success('Category created');
        } catch (error) {
            console.error('Failed to create category:', error);
            toast.error('Failed to create category');
            throw error;
        }
    };

    const handleUpdate = async (data: CreateCategoryData | UpdateCategoryData) => {
        if (!editingCategory) return;

        try {
            const updatedCategory = await updateCategory(editingCategory.id, data as UpdateCategoryData);

            // Update store
            setStoreCategories(storeCategories.map(c => c.id === editingCategory.id ? updatedCategory : c));

            toast.success('Category updated');
            setEditingCategory(undefined);
        } catch (error) {
            console.error('Failed to update category:', error);
            toast.error('Failed to update category');
            throw error;
        }
    };

    const handleDelete = async () => {
        if (!deletingCategoryId) return;

        try {
            await deleteCategory(deletingCategoryId);

            // Update store
            setStoreCategories(storeCategories.filter(c => c.id !== deletingCategoryId));

            toast.success('Category deleted');
        } catch (error) {
            console.error('Failed to delete category:', error);
            toast.error('Failed to delete category');
        } finally {
            setDeletingCategoryId(null);
        }
    };

    const router = useRouter();

    if (isLoading) {
        return (
            <div className="space-y-8">
                {/* Header skeleton */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-10 w-10 rounded-lg" />
                        <div className="space-y-2">
                            <Skeleton className="h-9 w-40" />
                            <Skeleton className="h-4 w-56" />
                        </div>
                    </div>
                    <Skeleton className="h-10 w-[100px]" />
                </div>
                {/* Content skeleton */}
                <Skeleton className="h-[400px] w-full rounded-xl" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push('/expense')}
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
                        <p className="text-muted-foreground mt-1">
                            Manage household-level categories that can be used across all budgets
                        </p>
                    </div>
                </div>

                <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add New
                </Button>
            </div>

            <Card>
                <CardContent className="p-6">
                    {categories.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="bg-muted/50 p-4 rounded-full mb-4">
                                <Tags className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-medium">No categories found</h3>
                            <p className="text-muted-foreground max-w-sm mt-2 mb-6">
                                Create categories to organize your expenses effectively.
                            </p>
                            <Button variant="outline" onClick={() => setIsCreateDialogOpen(true)}>
                                Create your first category
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {categories.map((category) => (
                                <div
                                    key={category.id}
                                    className="group relative flex items-center gap-4 p-4 rounded-xl border border-border/50 hover:border-primary/50 hover:bg-muted/30 transition-all"
                                >
                                    <div
                                        className="w-12 h-12 rounded-full flex items-center justify-center text-2xl shadow-sm"
                                        style={{
                                            backgroundColor: category.color ? `${category.color}20` : 'var(--muted)',
                                            color: category.color || 'var(--foreground)'
                                        }}
                                    >
                                        {category.icon || '💰'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-medium truncate">{category.name}</h3>
                                        <p className="text-xs text-muted-foreground">
                                            {category._count?.expenses || 0} expenses
                                        </p>
                                    </div>

                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                    <span className="sr-only">Open menu</span>
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem
                                                    onClick={() => setEditingCategory(category)}
                                                >
                                                    Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    className="text-red-600 focus:text-red-600"
                                                    onClick={() => setDeletingCategoryId(category.id)}
                                                >
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Create Dialog */}
            <CategoryDialog
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
                onSubmit={handleCreate}
            />

            {/* Edit Dialog */}
            <CategoryDialog
                open={!!editingCategory}
                onOpenChange={(open) => !open && setEditingCategory(undefined)}
                categoryToEdit={editingCategory}
                onSubmit={handleUpdate}
            />

            {/* Delete Alert */}
            <AlertDialog open={!!deletingCategoryId} onOpenChange={(open) => !open && setDeletingCategoryId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete this category. Expenses associated with this category will be preserved but may appear as uncategorized.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
