// Household API client for Zero Friction Budget

import { api } from './client';

export interface Household {
  id: string;
  name: string;
  ownerId: string;
  primaryBudgetId?: string | null;
  createdAt: string;
  updatedAt: string;
  owner?: {
    id: string;
    name: string;
    email: string;
  };
  members?: HouseholdMember[];
  _count?: {
    members: number;
    budgets: number;
    expenses: number;
  };
}

export interface HouseholdMember {
  id: string;
  userId: string;
  householdId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  joinedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
}

export interface CreateHouseholdData {
  name: string;
}

export interface UpdateHouseholdData {
  name?: string;
}

export interface InviteMemberData {
  email: string;
  role?: 'ADMIN' | 'MEMBER' | 'VIEWER';
}

export interface JoinHouseholdData {
  token: string;
  householdId: string;
}

export interface UpdateMemberRoleData {
  role: 'ADMIN' | 'MEMBER' | 'VIEWER';
}

/**
 * Household Management
 */

// List all households for the current user
export async function getHouseholds() {
  return api.get<Household[]>('/households');
}

// Get household details
export async function getHousehold(householdId: string) {
  return api.get<Household>(`/households/${householdId}`);
}

// Create a new household
export async function createHousehold(data: CreateHouseholdData) {
  return api.post<Household>('/households', data);
}

// Update household settings
export async function updateHousehold(
  householdId: string,
  data: UpdateHouseholdData
) {
  return api.patch<Household>(
    `/households/${householdId}`,
    data
  );
}

// Delete household (owner only)
export async function deleteHousehold(householdId: string) {
  return api.delete<{ message: string }>(
    `/households/${householdId}`
  );
}

/**
 * Household Members
 */

// Invite member to household
export async function inviteMember(
  householdId: string,
  data: InviteMemberData
) {
  return api.post<{ message: string; email: string }>(
    `/households/${householdId}/invite`,
    data
  );
}

// Accept household invitation
export async function joinHousehold(data: JoinHouseholdData) {
  return api.post<HouseholdMember>(
    `/households/${data.householdId}/join`,
    { token: data.token }
  );
}

// Remove member from household
export async function removeMember(householdId: string, userId: string) {
  return api.delete<{ message: string }>(
    `/households/${householdId}/members/${userId}`
  );
}

// Update member role
export async function updateMemberRole(
  householdId: string,
  userId: string,
  data: UpdateMemberRoleData
) {
  return api.patch<HouseholdMember>(
    `/households/${householdId}/members/${userId}/role`,
    data
  );
}

// Leave household
export async function leaveHousehold(householdId: string) {
  return api.post<{ success: boolean; message: string }>(
    `/households/${householdId}/leave`
  );
}
