'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth';
import { useUiStore } from '@/lib/stores/ui';
import {
    getHousehold,
    updateHousehold,
    inviteMember,
    updateMemberRole,
    removeMember,
    leaveHousehold,
    type Household,
    type HouseholdMember,
} from '@/lib/api/household-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
import {
    Loader2,
    UserPlus,
    LogOut,
    Trash2,
    Edit2,
    Check,
    X,
    Users,
    Crown,
} from 'lucide-react';

export default function HouseholdPage() {
    const { user } = useAuthStore();
    const { currentHouseholdId } = useUiStore();
    const router = useRouter();

    const [isLoading, setIsLoading] = useState(true);
    const [household, setHousehold] = useState<Household | null>(null);
    const [members, setMembers] = useState<HouseholdMember[]>([]);

    // Edit household name state
    const [isEditingName, setIsEditingName] = useState(false);
    const [householdName, setHouseholdName] = useState('');
    const [isSavingName, setIsSavingName] = useState(false);

    // Invite member state
    const [showInviteDialog, setShowInviteDialog] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER' | 'VIEWER'>('MEMBER');
    const [isInviting, setIsInviting] = useState(false);

    // Remove member state
    const [memberToRemove, setMemberToRemove] = useState<HouseholdMember | null>(null);
    const [isRemoving, setIsRemoving] = useState(false);

    // Leave household state
    const [showLeaveDialog, setShowLeaveDialog] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);

    // Role change state
    const [changingRoleForUserId, setChangingRoleForUserId] = useState<string | null>(null);

    // Get current user's role
    const currentUserRole = members.find((m) => m.userId === user?.id)?.role;
    const isOwner = currentUserRole === 'OWNER';
    const isAdmin = currentUserRole === 'ADMIN';
    const canManageMembers = isOwner || isAdmin;

    // Fetch household data
    useEffect(() => {
        const fetchHousehold = async () => {
            if (!currentHouseholdId) {
                toast.error('No household selected');
                return;
            }

            try {
                setIsLoading(true);
                const data = await getHousehold(currentHouseholdId);
                setHousehold(data);
                setHouseholdName(data.name);
                setMembers(data.members || []);
            } catch (error: any) {
                console.error('Failed to fetch household:', error);
                toast.error(error.message || 'Failed to load household data');
            } finally {
                setIsLoading(false);
            }
        };

        fetchHousehold();
    }, [currentHouseholdId]);

    // Save household name
    const handleSaveName = async () => {
        if (!household || !currentHouseholdId) return;

        if (!householdName.trim()) {
            toast.error('Household name cannot be empty');
            return;
        }

        try {
            setIsSavingName(true);
            const updated = await updateHousehold(currentHouseholdId, {
                name: householdName,
            });
            setHousehold(updated);
            setIsEditingName(false);
            toast.success('Household name updated');
        } catch (error: any) {
            console.error('Failed to update household name:', error);
            toast.error(error.message || 'Failed to update household name');
        } finally {
            setIsSavingName(false);
        }
    };

    // Cancel edit
    const handleCancelEdit = () => {
        setHouseholdName(household?.name || '');
        setIsEditingName(false);
    };

    // Invite member
    const handleInviteMember = async () => {
        if (!currentHouseholdId) return;

        if (!inviteEmail.trim()) {
            toast.error('Please enter an email address');
            return;
        }

        // Simple email validation
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) {
            toast.error('Please enter a valid email address');
            return;
        }

        try {
            setIsInviting(true);
            await inviteMember(currentHouseholdId, {
                email: inviteEmail,
                role: inviteRole,
            });

            toast.success(`Invitation sent to ${inviteEmail}`);

            setShowInviteDialog(false);
            setInviteEmail('');
            setInviteRole('MEMBER');
        } catch (error: any) {
            console.error('Failed to invite member:', error);
            toast.error(error.message || 'Failed to send invitation');
        } finally {
            setIsInviting(false);
        }
    };

    // Update member role
    const handleUpdateRole = async (memberId: string, userId: string, newRole: string) => {
        if (!currentHouseholdId) return;

        // Can't change owner role
        const member = members.find((m) => m.id === memberId);
        if (member?.role === 'OWNER') {
            toast.error('Cannot change the owner role');
            return;
        }

        try {
            setChangingRoleForUserId(userId);
            const updated = await updateMemberRole(currentHouseholdId, userId, {
                role: newRole as 'ADMIN' | 'MEMBER' | 'VIEWER',
            });

            // Update local state
            setMembers((prev) =>
                prev.map((m) => (m.id === memberId ? updated : m))
            );

            toast.success(`Member role updated to ${newRole}`);
        } catch (error: any) {
            console.error('Failed to update member role:', error);
            toast.error(error.message || 'Failed to update member role');
        } finally {
            setChangingRoleForUserId(null);
        }
    };

    // Remove member
    const handleRemoveMember = async () => {
        if (!currentHouseholdId || !memberToRemove) return;

        try {
            setIsRemoving(true);
            await removeMember(currentHouseholdId, memberToRemove.userId);

            // Update local state
            setMembers((prev) => prev.filter((m) => m.id !== memberToRemove.id));

            toast.success(`${memberToRemove.user.name} has been removed`);

            setMemberToRemove(null);
        } catch (error: any) {
            console.error('Failed to remove member:', error);
            toast.error(error.message || 'Failed to remove member');
        } finally {
            setIsRemoving(false);
        }
    };

    // Leave household
    const handleLeaveHousehold = async () => {
        if (!currentHouseholdId) return;

        try {
            setIsLeaving(true);
            await leaveHousehold(currentHouseholdId);

            toast.success('You have left the household');

            setShowLeaveDialog(false);

            // Redirect to dashboard and force reload households
            router.push('/dashboard');
            router.refresh();
        } catch (error: any) {
            console.error('Failed to leave household:', error);
            toast.error(error.message || 'Failed to leave household');
        } finally {
            setIsLeaving(false);
        }
    };

    // Get user initials
    const getInitials = (name: string) => {
        const parts = name.trim().split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name.slice(0, 2).toUpperCase();
    };

    // Role badge color
    const getRoleBadgeVariant = (role: string) => {
        switch (role) {
            case 'OWNER':
                return 'default';
            case 'ADMIN':
                return 'secondary';
            default:
                return 'outline';
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-64 mt-2" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-32 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!household) {
        return (
            <div className="space-y-6">
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-center text-muted-foreground">
                            No household found
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Household Information */}
            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                Household Information
                            </CardTitle>
                            <CardDescription>
                                Manage your household details
                            </CardDescription>
                        </div>
                        {!isOwner && (
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setShowLeaveDialog(true)}
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                Leave Household
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Household Name */}
                    <div className="space-y-2">
                        <Label>Household Name</Label>
                        {isEditingName ? (
                            <div className="flex gap-2">
                                <Input
                                    value={householdName}
                                    onChange={(e) => setHouseholdName(e.target.value)}
                                    placeholder="Enter household name"
                                    disabled={isSavingName}
                                />
                                <Button
                                    size="icon"
                                    onClick={handleSaveName}
                                    disabled={isSavingName}
                                >
                                    {isSavingName ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Check className="h-4 w-4" />
                                    )}
                                </Button>
                                <Button
                                    size="icon"
                                    variant="outline"
                                    onClick={handleCancelEdit}
                                    disabled={isSavingName}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <p className="text-lg font-medium">{household.name}</p>
                                {canManageMembers && (
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => setIsEditingName(true)}
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 pt-4">
                        <div className="text-center">
                            <p className="text-2xl font-bold">{members.length}</p>
                            <p className="text-sm text-muted-foreground">Members</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold">{household._count?.budgets || 0}</p>
                            <p className="text-sm text-muted-foreground">Budgets</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold">{household._count?.expenses || 0}</p>
                            <p className="text-sm text-muted-foreground">Expenses</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Members List */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Household Members</CardTitle>
                            <CardDescription>
                                Manage member roles and permissions
                            </CardDescription>
                        </div>
                        {canManageMembers && (
                            <Button onClick={() => setShowInviteDialog(true)}>
                                <UserPlus className="mr-2 h-4 w-4" />
                                Invite Member
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {members.map((member) => {
                            const isCurrentUser = member.userId === user?.id;
                            const canModifyMember = canManageMembers && !isCurrentUser && member.role !== 'OWNER';

                            return (
                                <div
                                    key={member.id}
                                    className="flex items-center justify-between p-4 border rounded-lg"
                                >
                                    <div className="flex items-center gap-3 flex-1">
                                        <Avatar>
                                            <AvatarImage src={member.user.image} />
                                            <AvatarFallback>
                                                {getInitials(member.user.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium">{member.user.name}</p>
                                                {member.role === 'OWNER' && (
                                                    <Crown className="h-4 w-4 text-yellow-500" />
                                                )}
                                                {isCurrentUser && (
                                                    <Badge variant="outline" className="text-xs">
                                                        You
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {member.user.email}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {/* Role Badge/Selector */}
                                        {canModifyMember ? (
                                            <Select
                                                value={member.role}
                                                onValueChange={(value) =>
                                                    handleUpdateRole(member.id, member.userId, value)
                                                }
                                                disabled={changingRoleForUserId === member.userId}
                                            >
                                                <SelectTrigger className="w-32">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="ADMIN">Admin</SelectItem>
                                                    <SelectItem value="MEMBER">Member</SelectItem>
                                                    <SelectItem value="VIEWER">Viewer</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <Badge variant={getRoleBadgeVariant(member.role)}>
                                                {member.role}
                                            </Badge>
                                        )}

                                        {/* Remove Button */}
                                        {canModifyMember && (
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => setMemberToRemove(member)}
                                                className="text-destructive hover:text-destructive"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Invite Member Dialog */}
            <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Invite Member</DialogTitle>
                        <DialogDescription>
                            Send an invitation to join your household
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="invite-email">Email Address</Label>
                            <Input
                                id="invite-email"
                                type="email"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                placeholder="member@example.com"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="invite-role">Role</Label>
                            <Select
                                value={inviteRole}
                                onValueChange={(value) =>
                                    setInviteRole(value as 'ADMIN' | 'MEMBER' | 'VIEWER')
                                }
                            >
                                <SelectTrigger id="invite-role">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ADMIN">
                                        <div>
                                            <p className="font-medium">Admin</p>
                                            <p className="text-xs text-muted-foreground">
                                                Can manage members and settings
                                            </p>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="MEMBER">
                                        <div>
                                            <p className="font-medium">Member</p>
                                            <p className="text-xs text-muted-foreground">
                                                Can add expenses and view budgets
                                            </p>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="VIEWER">
                                        <div>
                                            <p className="font-medium">Viewer</p>
                                            <p className="text-xs text-muted-foreground">
                                                Can only view data, no editing
                                            </p>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowInviteDialog(false);
                                setInviteEmail('');
                            }}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleInviteMember} disabled={isInviting}>
                            {isInviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Send Invitation
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Remove Member Confirmation */}
            <AlertDialog
                open={!!memberToRemove}
                onOpenChange={(open) => !open && setMemberToRemove(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove Member?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove {memberToRemove?.user.name} from this
                            household? They will lose access to all household data.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleRemoveMember}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isRemoving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Remove Member
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Leave Household Confirmation */}
            <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Leave Household?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to leave this household? You will need to be
                            re-invited to join again.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleLeaveHousehold}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isLeaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Leave Household
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
