# Zero Friction Budget - API Documentation

## Table of Contents
1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Environment Variables](#environment-variables)
4. [Response Format](#response-format)
5. [Multi-Household Architecture](#multi-household-architecture)
6. [Authorization Levels](#authorization-levels)
7. [Real-Time Features](#real-time-features)
8. [API Endpoints](#api-endpoints)
   - [Household Management](#household-management) (10 endpoints)
   - [Budget Management](#budget-management) (7 endpoints)
   - [Expense Management](#expense-management) (7 endpoints)
   - [Category Management](#category-management) (6 endpoints)
   - [Dashboard & Analytics](#dashboard--analytics) (3 endpoints)
9. [Error Handling](#error-handling)
10. [Testing Guide](#testing-guide)

---

## Overview

**Base URL:** `http://localhost:5000`
**Total Endpoints:** 33 (Phase 2)
**Real-time:** Supabase Realtime with HTTP broadcasts
**Caching:** NodeCache (5-minute TTL for dashboard endpoints)

### Technology Stack
- **Framework:** Express.js
- **Database:** PostgreSQL (via Prisma ORM)
- **Validation:** Zod
- **Real-time:** Supabase Realtime
- **Caching:** node-cache
- **Authentication:** JWT (Bearer tokens)

---

## Authentication

All endpoints require authentication via JWT Bearer tokens in the `Authorization` header:

```http
Authorization: Bearer <your-jwt-token>
```

### How to Get a Token
1. Use the `/auth/login` endpoint with valid credentials
2. Token is returned in response
3. Include token in all subsequent requests

### Token Expiry
- **Access Token:** 1 day (configurable via `JWT_EXPIRY`)
- **Refresh Token:** 7 days (configurable via `JWT_REFRESH_EXPIRY`)

---

## Environment Variables

### Required Variables

```env
# Server Configuration
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

# Database (Supabase PostgreSQL)
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]/postgres
DIRECT_URL=postgresql://postgres:[PASSWORD]@[HOST]/postgres

# JWT Configuration
JWT_SECRET=your-secret-key-min-32-characters-change-in-production
JWT_EXPIRY=1d
JWT_REFRESH_SECRET=your-refresh-secret-min-32-characters-change-in-production
JWT_REFRESH_EXPIRY=7d

# Email Service (Resend)
RESEND_API_KEY=re_your_api_key_here
EMAIL_FROM=noreply@yourdomain.com

# Encryption
ENCRYPTION_KEY=your-32-byte-hex-encryption-key-here

# Session
SESSION_SECRET=your-session-secret-min-32-characters

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=./logs/app.log
```

### Optional Variables (for Real-time Features)

```env
# Supabase Realtime Configuration
# Get from: https://app.supabase.com/project/_/settings/api
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=your-supabase-service-role-secret
```

### Optional Variables (OAuth & SMS)

```env
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/auth/google/callback

# SMS Service (Twilio - for 2FA via SMS)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## Response Format

All API responses follow this consistent structure:

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data here
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message description"
}
```

### Pagination Response
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "total": 100,
      "limit": 50,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

---

## Multi-Household Architecture

### Critical Security Feature
Every household's data is **strictly isolated**. Users can belong to multiple households with different roles in each.

### How It Works
1. **User creates/joins household** → HouseholdMember record created
2. **All requests** → Middleware validates household membership
3. **Database queries** → Filtered by `householdId` to prevent cross-household data access
4. **Real-time channels** → Isolated per household (`household:${householdId}`)

### Middleware Chain
```javascript
authenticateToken → requireHouseholdMember → requireAdmin/Owner (if needed)
```

---

## Authorization Levels

### Role Hierarchy

| Role | Description | Permissions |
|------|-------------|-------------|
| **OWNER** | Creator of household | Full control: create, read, update, delete everything; manage members and roles; delete household |
| **ADMIN** | Household administrator | Manage budgets, expenses, categories; invite/remove members (cannot change OWNER role) |
| **MEMBER** | Regular member | Create/edit own expenses; view budgets and categories; cannot manage members or household settings |
| **VIEWER** | Read-only access | View-only access to household data; cannot create or modify anything |

### Permission Matrix

| Action | OWNER | ADMIN | MEMBER | VIEWER |
|--------|-------|-------|--------|--------|
| Create/Update/Delete Budget | ✅ | ✅ | ❌ | ❌ |
| Create Expense | ✅ | ✅ | ✅ | ❌ |
| Edit Own Expense | ✅ | ✅ | ✅ | ❌ |
| Edit Any Expense | ✅ | ✅ | ❌ | ❌ |
| Create/Update/Delete Category | ✅ | ✅ | ❌ | ❌ |
| Invite Members | ✅ | ✅ | ❌ | ❌ |
| Remove Members | ✅ | ✅ | ❌ | ❌ |
| Change Member Roles | ✅ | ❌ | ❌ | ❌ |
| Update Household Settings | ✅ | ✅ | ❌ | ❌ |
| Delete Household | ✅ | ❌ | ❌ | ❌ |
| View All Data | ✅ | ✅ | ✅ | ✅ |

---

## Real-Time Features

### Overview
Real-time features use **Supabase Realtime** with HTTP broadcasts for instant updates across all connected clients.

### Channel Pattern
Each household has its own isolated channel:
```
household:${householdId}
```

Example: `household:cm3z8xy9k000008l70xh5d123`

### Broadcast Events

#### 1. Expense Events

##### `expense:created`
Triggered when a new expense is created.

```javascript
{
  event: 'expense:created',
  payload: {
    id: 'expense-uuid',
    householdId: 'household-uuid',
    amount: 50.00,
    type: 'EXPENSE',
    description: 'Grocery shopping',
    date: '2025-11-29T10:30:00Z',
    budgetId: 'budget-uuid',
    categoryId: 'category-uuid',
    createdById: 'user-uuid',
    createdAt: '2025-11-29T10:30:00Z'
  }
}
```

##### `expense:updated`
Triggered when an expense is modified.

```javascript
{
  event: 'expense:updated',
  payload: {
    id: 'expense-uuid',
    householdId: 'household-uuid',
    amount: 55.00,  // Updated amount
    description: 'Grocery shopping (updated)',
    // ... other updated fields
    updatedAt: '2025-11-29T11:00:00Z'
  }
}
```

##### `expense:deleted`
Triggered when an expense is deleted.

```javascript
{
  event: 'expense:deleted',
  payload: {
    id: 'expense-uuid',
    householdId: 'household-uuid'
  }
}
```

#### 2. Budget Events

##### `budget:updated`
Triggered for budget create, update, or delete operations.

```javascript
// Create
{
  event: 'budget:updated',
  payload: {
    action: 'created',
    budget: {
      id: 'budget-uuid',
      householdId: 'household-uuid',
      name: 'Monthly Groceries',
      amount: 500.00,
      period: 'MONTHLY',
      startDate: '2025-11-01T00:00:00Z',
      endDate: '2025-11-30T23:59:59Z',
      // ... other fields
    }
  }
}

// Update
{
  event: 'budget:updated',
  payload: {
    action: 'updated',
    budget: { /* updated budget object */ }
  }
}

// Delete
{
  event: 'budget:updated',
  payload: {
    action: 'deleted',
    budgetId: 'budget-uuid',
    householdId: 'household-uuid'
  }
}
```

### Client-Side Subscription (Example)

```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Subscribe to household channel
const channel = supabase
  .channel(`household:${householdId}`)
  .on('broadcast', { event: 'expense:created' }, ({ payload }) => {
    console.log('New expense:', payload)
    // Update UI with new expense
  })
  .on('broadcast', { event: 'expense:updated' }, ({ payload }) => {
    console.log('Expense updated:', payload)
    // Update UI with updated expense
  })
  .on('broadcast', { event: 'expense:deleted' }, ({ payload }) => {
    console.log('Expense deleted:', payload)
    // Remove expense from UI
  })
  .on('broadcast', { event: 'budget:updated' }, ({ payload }) => {
    console.log('Budget updated:', payload)
    // Update UI with budget changes
  })
  .subscribe()

// Cleanup on unmount
return () => {
  channel.unsubscribe()
}
```

### Graceful Degradation
- If Supabase credentials are not configured, real-time broadcasts are skipped
- API operations continue to work normally without real-time
- No errors thrown to clients
- Warning logged on server startup

---

## API Endpoints

---

## Household Management

### 1. Create Household

**POST** `/households`

Create a new household. The creator automatically becomes the OWNER.

**Authorization:** Bearer token required
**Required Role:** Any authenticated user

**Request Body:**
```json
{
  "name": "Smith Family Budget"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "household": {
      "id": "cm3z8xy9k000008l70xh5d123",
      "name": "Smith Family Budget",
      "createdAt": "2025-11-29T10:00:00Z"
    }
  }
}
```

**Validation:**
- `name`: Required, 1-100 characters

**Errors:**
- `400`: Validation error
- `401`: Unauthorized (no token)

---

### 2. List User's Households

**GET** `/households`

List all households the authenticated user is a member of.

**Authorization:** Bearer token required

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "households": [
      {
        "id": "cm3z8xy9k000008l70xh5d123",
        "name": "Smith Family Budget",
        "role": "OWNER",
        "joinedAt": "2025-11-29T10:00:00Z",
        "memberCount": 4,
        "createdAt": "2025-11-29T10:00:00Z"
      },
      {
        "id": "cm3z8xy9k000008l70xh5d456",
        "name": "Work Team Budget",
        "role": "MEMBER",
        "joinedAt": "2025-11-25T14:30:00Z",
        "memberCount": 12,
        "createdAt": "2025-11-20T09:00:00Z"
      }
    ]
  }
}
```

---

### 3. Get Household Details

**GET** `/households/:id`

Get detailed information about a specific household.

**Authorization:** Bearer token required
**Required Role:** Must be a member of the household

**URL Parameters:**
- `id`: Household UUID

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "household": {
      "id": "cm3z8xy9k000008l70xh5d123",
      "name": "Smith Family Budget",
      "createdAt": "2025-11-29T10:00:00Z",
      "members": [
        {
          "id": "member-uuid-1",
          "userId": "user-uuid-1",
          "role": "OWNER",
          "joinedAt": "2025-11-29T10:00:00Z",
          "user": {
            "id": "user-uuid-1",
            "fullName": "John Smith",
            "email": "john@example.com"
          }
        },
        {
          "id": "member-uuid-2",
          "userId": "user-uuid-2",
          "role": "ADMIN",
          "joinedAt": "2025-11-29T11:00:00Z",
          "user": {
            "id": "user-uuid-2",
            "fullName": "Jane Smith",
            "email": "jane@example.com"
          }
        }
      ]
    }
  }
}
```

**Errors:**
- `403`: Not a member of household
- `404`: Household not found

---

### 4. Update Household Settings

**PATCH** `/households/:id`

Update household name or other settings.

**Authorization:** Bearer token required
**Required Role:** ADMIN or OWNER

**URL Parameters:**
- `id`: Household UUID

**Request Body:**
```json
{
  "name": "Updated Family Budget"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "household": {
      "id": "cm3z8xy9k000008l70xh5d123",
      "name": "Updated Family Budget",
      "updatedAt": "2025-11-29T12:00:00Z"
    }
  }
}
```

**Errors:**
- `403`: Insufficient permissions (requires ADMIN or OWNER)
- `404`: Household not found

---

### 5. Delete Household

**DELETE** `/households/:id`

Permanently delete a household and all associated data (budgets, expenses, categories).

**Authorization:** Bearer token required
**Required Role:** OWNER only

**URL Parameters:**
- `id`: Household UUID

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "message": "Household deleted successfully"
  }
}
```

**Errors:**
- `403`: Insufficient permissions (OWNER only)
- `404`: Household not found

**Warning:** This action is **irreversible** and will delete:
- All budgets
- All expenses
- All categories
- All household members (except relations in other households)

---

### 6. Invite Member to Household

**POST** `/households/:id/invite`

Invite a new member to the household via email.

**Authorization:** Bearer token required
**Required Role:** ADMIN or OWNER

**URL Parameters:**
- `id`: Household UUID

**Request Body:**
```json
{
  "email": "newmember@example.com",
  "role": "MEMBER"  // Optional, defaults to MEMBER
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "message": "Invitation sent successfully",
    "invitationToken": "inv_xYz123AbC...",
    "expiresAt": "2025-12-06T10:00:00Z"
  }
}
```

**Validation:**
- `email`: Required, valid email format
- `role`: Optional, must be one of: `MEMBER`, `ADMIN` (cannot invite as OWNER)

**Errors:**
- `400`: User already a member
- `403`: Insufficient permissions (requires ADMIN or OWNER)
- `404`: Household not found

---

### 7. Join Household

**POST** `/households/:id/join`

Accept an invitation and join a household.

**Authorization:** Bearer token required

**URL Parameters:**
- `id`: Household UUID

**Request Body:**
```json
{
  "token": "inv_xYz123AbC...",
  "role": "MEMBER"  // Optional, typically set by invitation
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "member": {
      "id": "member-uuid",
      "householdId": "cm3z8xy9k000008l70xh5d123",
      "userId": "user-uuid",
      "role": "MEMBER",
      "joinedAt": "2025-11-29T14:00:00Z"
    }
  }
}
```

**Errors:**
- `400`: Already a member, or invalid/expired token
- `404`: Household not found

---

### 8. Remove Member from Household

**DELETE** `/households/:id/members/:userId`

Remove a member from the household.

**Authorization:** Bearer token required
**Required Role:** ADMIN or OWNER

**URL Parameters:**
- `id`: Household UUID
- `userId`: User UUID to remove

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "message": "Member removed successfully"
  }
}
```

**Errors:**
- `400`: Cannot remove the OWNER
- `403`: Insufficient permissions (requires ADMIN or OWNER)
- `404`: Member not found

**Notes:**
- OWNER cannot be removed (must delete household instead)
- Expenses created by removed member remain in household

---

### 9. Update Member Role

**PATCH** `/households/:id/members/:userId/role`

Change a member's role within the household.

**Authorization:** Bearer token required
**Required Role:** OWNER only

**URL Parameters:**
- `id`: Household UUID
- `userId`: User UUID

**Request Body:**
```json
{
  "role": "ADMIN"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "member": {
      "id": "member-uuid",
      "householdId": "cm3z8xy9k000008l70xh5d123",
      "userId": "user-uuid",
      "role": "ADMIN",
      "updatedAt": "2025-11-29T15:00:00Z"
    }
  }
}
```

**Validation:**
- `role`: Required, must be one of: `ADMIN`, `MEMBER`, `VIEWER`

**Errors:**
- `400`: Cannot change OWNER role
- `403`: Insufficient permissions (OWNER only)
- `404`: Member not found

**Notes:**
- Only OWNER can change roles
- Cannot change the OWNER role (ownership transfer not supported)

---

### 10. Leave Household

**POST** `/households/:id/leave`

Leave a household that you're a member of.

**Authorization:** Bearer token required
**Required Role:** Any member (except OWNER)

**URL Parameters:**
- `id`: Household UUID

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "message": "Successfully left household"
  }
}
```

**Errors:**
- `403`: OWNER cannot leave (must delete household instead)
- `404`: Household not found or not a member

**Notes:**
- OWNER cannot leave household (must delete it instead)
- Expenses you created remain in the household

---

## Budget Management

### 1. Create Budget

**POST** `/budgets`

Create a new budget for a household.

**Authorization:** Bearer token required
**Required Role:** ADMIN or OWNER

**Request Body:**
```json
{
  "householdId": "cm3z8xy9k000008l70xh5d123",
  "name": "Monthly Groceries",
  "amount": 500.00,
  "period": "MONTHLY",
  "startDate": "2025-11-01T00:00:00Z",
  "endDate": "2025-11-30T23:59:59Z",  // Optional for CUSTOM period
  "categoryId": "category-uuid"  // Optional
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "budget": {
      "id": "budget-uuid",
      "householdId": "cm3z8xy9k000008l70xh5d123",
      "name": "Monthly Groceries",
      "amount": 500.00,
      "period": "MONTHLY",
      "startDate": "2025-11-01T00:00:00Z",
      "endDate": "2025-11-30T23:59:59Z",
      "categoryId": "category-uuid",
      "createdAt": "2025-11-29T10:00:00Z"
    }
  }
}
```

**Validation:**
- `householdId`: Required, valid UUID
- `name`: Required, string
- `amount`: Required, number ≥ 0
- `period`: Required, one of: `WEEKLY`, `BIWEEKLY`, `MONTHLY`, `QUARTERLY`, `YEARLY`, `CUSTOM`
- `startDate`: Required, ISO 8601 datetime
- `endDate`: Optional (required for CUSTOM period), ISO 8601 datetime
- `categoryId`: Optional, valid category UUID

**Errors:**
- `400`: Validation error
- `403`: Not authorized (requires ADMIN or OWNER)

**Real-time:** Broadcasts `budget:updated` event with `action: 'created'`

---

### 2. List Budgets

**GET** `/budgets`

List all budgets for a household with current progress.

**Authorization:** Bearer token required
**Required Role:** Any household member

**Query Parameters:**
- `householdId` (required): Household UUID
- `period` (optional): Filter by period (`WEEKLY`, `MONTHLY`, etc.)

**Example:** `/budgets?householdId=cm3z8xy9k000008l70xh5d123&period=MONTHLY`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "budgets": [
      {
        "id": "budget-uuid-1",
        "householdId": "cm3z8xy9k000008l70xh5d123",
        "name": "Monthly Groceries",
        "amount": 500.00,
        "period": "MONTHLY",
        "startDate": "2025-11-01T00:00:00Z",
        "endDate": "2025-11-30T23:59:59Z",
        "categoryId": "category-uuid",
        "progress": {
          "spent": 320.50,
          "remaining": 179.50,
          "percentage": 64.1,
          "status": "ON_TRACK"  // ON_TRACK, WARNING, or OVER_BUDGET
        },
        "category": {
          "id": "category-uuid",
          "name": "Groceries",
          "icon": "🛒"
        }
      }
    ]
  }
}
```

**Errors:**
- `400`: Missing householdId
- `403`: Not a member of household

---

### 3. Get Budget Details

**GET** `/budgets/:id`

Get detailed information about a specific budget including progress.

**Authorization:** Bearer token required
**Required Role:** Any household member

**URL Parameters:**
- `id`: Budget UUID

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "budget": {
      "id": "budget-uuid",
      "householdId": "cm3z8xy9k000008l70xh5d123",
      "name": "Monthly Groceries",
      "amount": 500.00,
      "period": "MONTHLY",
      "startDate": "2025-11-01T00:00:00Z",
      "endDate": "2025-11-30T23:59:59Z",
      "categoryId": "category-uuid",
      "createdAt": "2025-11-01T00:00:00Z",
      "progress": {
        "spent": 320.50,
        "remaining": 179.50,
        "percentage": 64.1,
        "status": "ON_TRACK",
        "daysElapsed": 29,
        "totalDays": 30,
        "projectedSpending": 331.03  // Based on current rate
      },
      "category": {
        "id": "category-uuid",
        "name": "Groceries",
        "icon": "🛒",
        "color": "#10b981"
      }
    }
  }
}
```

**Errors:**
- `403`: Not a member of household
- `404`: Budget not found

---

### 4. Update Budget

**PATCH** `/budgets/:id`

Update budget details.

**Authorization:** Bearer token required
**Required Role:** ADMIN or OWNER

**URL Parameters:**
- `id`: Budget UUID

**Request Body:** (all fields optional)
```json
{
  "name": "Updated Budget Name",
  "amount": 600.00,
  "period": "MONTHLY",
  "startDate": "2025-12-01T00:00:00Z",
  "endDate": "2025-12-31T23:59:59Z",
  "categoryId": "new-category-uuid"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "budget": {
      "id": "budget-uuid",
      "name": "Updated Budget Name",
      "amount": 600.00,
      // ... updated fields
      "updatedAt": "2025-11-29T16:00:00Z"
    }
  }
}
```

**Errors:**
- `403`: Not authorized (requires ADMIN or OWNER)
- `404`: Budget not found

**Real-time:** Broadcasts `budget:updated` event with `action: 'updated'`

---

### 5. Delete Budget

**DELETE** `/budgets/:id`

Delete a budget. Expenses associated with this budget will have `budgetId` set to null.

**Authorization:** Bearer token required
**Required Role:** ADMIN or OWNER

**URL Parameters:**
- `id`: Budget UUID

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "message": "Budget deleted successfully"
  }
}
```

**Errors:**
- `403`: Not authorized (requires ADMIN or OWNER)
- `404`: Budget not found

**Real-time:** Broadcasts `budget:updated` event with `action: 'deleted'`

**Notes:**
- Associated expenses remain (budgetId set to null)
- Cannot be undone

---

### 6. Get Budget Progress

**GET** `/budgets/:id/progress`

Get detailed budget progress with category breakdown.

**Authorization:** Bearer token required
**Required Role:** Any household member

**URL Parameters:**
- `id`: Budget UUID

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "budget": {
      "id": "budget-uuid",
      "name": "Monthly Groceries",
      "amount": 500.00,
      "period": "MONTHLY",
      "startDate": "2025-11-01T00:00:00Z",
      "endDate": "2025-11-30T23:59:59Z"
    },
    "progress": {
      "spent": 320.50,
      "remaining": 179.50,
      "percentage": 64.1,
      "status": "ON_TRACK",
      "daysElapsed": 29,
      "totalDays": 30,
      "projectedSpending": 331.03
    },
    "breakdown": {
      "byCategory": [
        {
          "categoryId": "cat-1",
          "categoryName": "Produce",
          "amount": 120.00,
          "percentage": 37.5
        },
        {
          "categoryId": "cat-2",
          "categoryName": "Meat",
          "amount": 200.50,
          "percentage": 62.5
        }
      ],
      "byType": {
        "EXPENSE": 320.50,
        "INCOME": 0
      }
    },
    "recentExpenses": [
      {
        "id": "expense-uuid",
        "amount": 45.00,
        "description": "Whole Foods",
        "date": "2025-11-28T14:30:00Z",
        "categoryName": "Produce"
      }
    ]
  }
}
```

**Errors:**
- `403`: Not a member of household
- `404`: Budget not found

---

### 7. Rollover Budget

**POST** `/budgets/:id/rollover`

Create a new budget for the next period based on current budget settings.

**Authorization:** Bearer token required
**Required Role:** ADMIN or OWNER

**URL Parameters:**
- `id`: Budget UUID (source budget)

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "budget": {
      "id": "new-budget-uuid",
      "householdId": "cm3z8xy9k000008l70xh5d123",
      "name": "Monthly Groceries",  // Same as source
      "amount": 500.00,  // Same as source
      "period": "MONTHLY",
      "startDate": "2025-12-01T00:00:00Z",  // Next period
      "endDate": "2025-12-31T23:59:59Z",
      "categoryId": "category-uuid",  // Same as source
      "createdAt": "2025-11-29T17:00:00Z"
    }
  }
}
```

**Errors:**
- `403`: Not authorized (requires ADMIN or OWNER)
- `404`: Budget not found

**Real-time:** Broadcasts `budget:updated` event with `action: 'created'`

**Notes:**
- Creates exact copy of budget for next period
- Calculates next period based on current budget's period type
- Useful for recurring monthly/weekly budgets

---

## Expense Management

### 1. Create Expense

**POST** `/expenses`

Create a new expense (or income/transfer).

**Authorization:** Bearer token required
**Required Role:** Any household member (OWNER, ADMIN, or MEMBER)

**Request Body:**
```json
{
  "householdId": "cm3z8xy9k000008l70xh5d123",
  "amount": 45.99,
  "type": "EXPENSE",  // EXPENSE, INCOME, or TRANSFER
  "description": "Grocery shopping at Whole Foods",
  "date": "2025-11-29T14:30:00Z",  // Optional, defaults to now
  "budgetId": "budget-uuid",  // Optional
  "categoryId": "category-uuid",  // Optional
  "isRecurring": false,  // Optional, defaults to false
  "recurringId": "recurring-uuid",  // Optional, for recurring expenses
  "attachments": ["https://example.com/receipt.jpg"],  // Optional
  "tags": ["groceries", "weekly"]  // Optional
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "expense": {
      "id": "expense-uuid",
      "householdId": "cm3z8xy9k000008l70xh5d123",
      "amount": 45.99,
      "type": "EXPENSE",
      "description": "Grocery shopping at Whole Foods",
      "date": "2025-11-29T14:30:00Z",
      "budgetId": "budget-uuid",
      "categoryId": "category-uuid",
      "createdById": "user-uuid",
      "isRecurring": false,
      "attachments": ["https://example.com/receipt.jpg"],
      "tags": ["groceries", "weekly"],
      "createdAt": "2025-11-29T14:30:00Z"
    }
  }
}
```

**Validation:**
- `householdId`: Required, valid UUID
- `amount`: Required, number ≥ 0
- `type`: Optional, one of: `INCOME`, `EXPENSE`, `TRANSFER` (defaults to `EXPENSE`)
- `description`: Optional, max 500 characters
- `date`: Optional, ISO 8601 datetime (defaults to current time)
- `budgetId`: Optional, valid budget UUID
- `categoryId`: Optional, valid category UUID
- `tags`: Optional, array of strings

**Errors:**
- `400`: Validation error
- `403`: Not a member of household

**Real-time:** Broadcasts `expense:created` event

---

### 2. Bulk Create Expenses

**POST** `/expenses/bulk`

Create multiple expenses in a single request (e.g., from CSV import).

**Authorization:** Bearer token required
**Required Role:** Any household member

**Request Body:**
```json
{
  "expenses": [
    {
      "householdId": "cm3z8xy9k000008l70xh5d123",
      "amount": 45.99,
      "type": "EXPENSE",
      "description": "Grocery shopping",
      "date": "2025-11-29T14:30:00Z",
      "categoryId": "category-uuid",
      "tags": ["groceries"]
    },
    {
      "householdId": "cm3z8xy9k000008l70xh5d123",
      "amount": 20.00,
      "type": "EXPENSE",
      "description": "Gas",
      "date": "2025-11-29T10:00:00Z",
      "categoryId": "category-uuid-2",
      "tags": ["transportation"]
    }
  ]
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "created": 2,
    "expenses": [
      {
        "id": "expense-uuid-1",
        "amount": 45.99,
        "description": "Grocery shopping",
        // ...
      },
      {
        "id": "expense-uuid-2",
        "amount": 20.00,
        "description": "Gas",
        // ...
      }
    ]
  }
}
```

**Validation:**
- `expenses`: Required, array of 1-100 expense objects
- Each expense follows same validation as single create

**Errors:**
- `400`: Validation error (e.g., too many expenses, invalid data)
- `403`: Not authorized for one or more households

**Real-time:** Broadcasts `expense:created` event for each expense created

**Notes:**
- Maximum 100 expenses per request
- All expenses must be for households where user is a member
- Atomic operation (all succeed or all fail)

---

### 3. Get Expense Summary

**GET** `/expenses/summary`

Get aggregated expense summary with grouping options.

**Authorization:** Bearer token required
**Required Role:** Any household member

**Query Parameters:**
- `householdId` (required): Household UUID
- `startDate` (optional): ISO 8601 datetime
- `endDate` (optional): ISO 8601 datetime
- `groupBy` (optional): `category`, `type`, `month`, or `budget` (defaults to `category`)

**Example:** `/expenses/summary?householdId=cm3z8xy9k000008l70xh5d123&startDate=2025-11-01T00:00:00Z&endDate=2025-11-30T23:59:59Z&groupBy=category`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalExpenses": 850.50,
      "totalIncome": 3000.00,
      "netAmount": 2149.50,
      "transactionCount": 45
    },
    "groupedBy": "category",
    "groups": [
      {
        "groupKey": "Groceries",
        "groupId": "category-uuid-1",
        "totalAmount": 320.50,
        "count": 12,
        "percentage": 37.7
      },
      {
        "groupKey": "Transportation",
        "groupId": "category-uuid-2",
        "totalAmount": 150.00,
        "count": 8,
        "percentage": 17.6
      }
    ],
    "period": {
      "startDate": "2025-11-01T00:00:00Z",
      "endDate": "2025-11-30T23:59:59Z"
    }
  }
}
```

**Errors:**
- `400`: Missing householdId
- `403`: Not a member of household

---

### 4. List Expenses

**GET** `/expenses`

List expenses with advanced filtering and pagination.

**Authorization:** Bearer token required
**Required Role:** Any household member

**Query Parameters:**
- `householdId` (required): Household UUID
- `budgetId` (optional): Filter by budget
- `categoryId` (optional): Filter by category
- `type` (optional): `INCOME`, `EXPENSE`, or `TRANSFER`
- `startDate` (optional): ISO 8601 datetime
- `endDate` (optional): ISO 8601 datetime
- `minAmount` (optional): Minimum amount
- `maxAmount` (optional): Maximum amount
- `tags` (optional): Comma-separated tags (e.g., `groceries,weekly`)
- `limit` (optional): Items per page (default: 50, max: 100)
- `offset` (optional): Pagination offset (default: 0)

**Example:** `/expenses?householdId=cm3z8xy9k000008l70xh5d123&categoryId=cat-1&limit=20&offset=0`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "expenses": [
      {
        "id": "expense-uuid",
        "householdId": "cm3z8xy9k000008l70xh5d123",
        "amount": 45.99,
        "type": "EXPENSE",
        "description": "Grocery shopping",
        "date": "2025-11-29T14:30:00Z",
        "budgetId": "budget-uuid",
        "categoryId": "category-uuid",
        "createdById": "user-uuid",
        "tags": ["groceries", "weekly"],
        "createdAt": "2025-11-29T14:30:00Z",
        "category": {
          "id": "category-uuid",
          "name": "Groceries",
          "icon": "🛒"
        },
        "createdBy": {
          "id": "user-uuid",
          "fullName": "John Smith"
        }
      }
    ],
    "pagination": {
      "total": 120,
      "limit": 20,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

**Errors:**
- `400`: Missing householdId
- `403`: Not a member of household

---

### 5. Get Expense by ID

**GET** `/expenses/:id`

Get detailed information about a specific expense.

**Authorization:** Bearer token required
**Required Role:** Any household member

**URL Parameters:**
- `id`: Expense UUID

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "expense": {
      "id": "expense-uuid",
      "householdId": "cm3z8xy9k000008l70xh5d123",
      "amount": 45.99,
      "type": "EXPENSE",
      "description": "Grocery shopping at Whole Foods",
      "date": "2025-11-29T14:30:00Z",
      "budgetId": "budget-uuid",
      "categoryId": "category-uuid",
      "createdById": "user-uuid",
      "isRecurring": false,
      "attachments": ["https://example.com/receipt.jpg"],
      "tags": ["groceries", "weekly"],
      "createdAt": "2025-11-29T14:30:00Z",
      "updatedAt": "2025-11-29T14:30:00Z",
      "category": {
        "id": "category-uuid",
        "name": "Groceries",
        "icon": "🛒",
        "color": "#10b981"
      },
      "budget": {
        "id": "budget-uuid",
        "name": "Monthly Groceries",
        "amount": 500.00
      },
      "createdBy": {
        "id": "user-uuid",
        "fullName": "John Smith",
        "email": "john@example.com"
      }
    }
  }
}
```

**Errors:**
- `403`: Not a member of household
- `404`: Expense not found

---

### 6. Update Expense

**PATCH** `/expenses/:id`

Update an expense. Only the creator or ADMIN/OWNER can modify.

**Authorization:** Bearer token required
**Required Role:** Expense creator, or ADMIN/OWNER

**URL Parameters:**
- `id`: Expense UUID

**Request Body:** (all fields optional)
```json
{
  "amount": 50.00,
  "type": "EXPENSE",
  "description": "Updated description",
  "date": "2025-11-29T15:00:00Z",
  "budgetId": "new-budget-uuid",
  "categoryId": "new-category-uuid",
  "attachments": ["https://example.com/new-receipt.jpg"],
  "tags": ["groceries", "monthly"]
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "expense": {
      "id": "expense-uuid",
      "amount": 50.00,
      "description": "Updated description",
      // ... updated fields
      "updatedAt": "2025-11-29T18:00:00Z"
    }
  }
}
```

**Errors:**
- `403`: Not authorized (must be creator or ADMIN/OWNER)
- `404`: Expense not found

**Real-time:** Broadcasts `expense:updated` event

---

### 7. Delete Expense

**DELETE** `/expenses/:id`

Delete an expense. Only the creator or ADMIN/OWNER can delete.

**Authorization:** Bearer token required
**Required Role:** Expense creator, or ADMIN/OWNER

**URL Parameters:**
- `id`: Expense UUID

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "message": "Expense deleted successfully"
  }
}
```

**Errors:**
- `403`: Not authorized (must be creator or ADMIN/OWNER)
- `404`: Expense not found

**Real-time:** Broadcasts `expense:deleted` event

**Notes:**
- Deletion is permanent and cannot be undone
- Affects budget progress calculations

---

## Category Management

### 1. Get Default Categories

**GET** `/categories/default`

Get list of default category templates for seeding new households.

**Authorization:** Bearer token required

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "name": "Groceries",
        "icon": "🛒",
        "color": "#10b981"
      },
      {
        "name": "Transportation",
        "icon": "🚗",
        "color": "#3b82f6"
      },
      {
        "name": "Housing",
        "icon": "🏠",
        "color": "#8b5cf6"
      },
      {
        "name": "Utilities",
        "icon": "⚡",
        "color": "#f59e0b"
      },
      {
        "name": "Entertainment",
        "icon": "🎬",
        "color": "#ec4899"
      }
    ],
    "count": 5
  }
}
```

**Notes:**
- These are templates, not actual database records
- Use `/categories/seed` to create these for a household

---

### 2. Seed Default Categories

**POST** `/categories/seed`

Create default categories for a household using predefined templates.

**Authorization:** Bearer token required
**Required Role:** ADMIN or OWNER

**Request Body:**
```json
{
  "householdId": "cm3z8xy9k000008l70xh5d123"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "created": 5,
    "categories": [
      {
        "id": "cat-uuid-1",
        "householdId": "cm3z8xy9k000008l70xh5d123",
        "name": "Groceries",
        "icon": "🛒",
        "color": "#10b981"
      },
      {
        "id": "cat-uuid-2",
        "householdId": "cm3z8xy9k000008l70xh5d123",
        "name": "Transportation",
        "icon": "🚗",
        "color": "#3b82f6"
      }
      // ... more categories
    ]
  }
}
```

**Errors:**
- `400`: Household already has categories
- `403`: Not authorized (requires ADMIN or OWNER)

**Notes:**
- Can only seed once per household
- Prevents accidental duplicate seeding
- Use this for quick household setup

---

### 3. List Categories

**GET** `/categories`

List all categories for a household with usage statistics.

**Authorization:** Bearer token required
**Required Role:** Any household member

**Query Parameters:**
- `householdId` (required): Household UUID

**Example:** `/categories?householdId=cm3z8xy9k000008l70xh5d123`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "cat-uuid-1",
        "householdId": "cm3z8xy9k000008l70xh5d123",
        "name": "Groceries",
        "icon": "🛒",
        "color": "#10b981",
        "parentId": null,
        "parent": null,
        "children": [
          {
            "id": "cat-uuid-sub-1",
            "name": "Produce",
            "icon": "🥬",
            "parentId": "cat-uuid-1"
          }
        ],
        "expenseCount": 45,  // Number of expenses using this category
        "budgetCount": 3,    // Number of budgets using this category
        "createdAt": "2025-11-01T00:00:00Z"
      },
      {
        "id": "cat-uuid-2",
        "householdId": "cm3z8xy9k000008l70xh5d123",
        "name": "Transportation",
        "icon": "🚗",
        "color": "#3b82f6",
        "parentId": null,
        "children": [],
        "expenseCount": 20,
        "budgetCount": 1,
        "createdAt": "2025-11-01T00:00:00Z"
      }
    ],
    "total": 2
  }
}
```

**Errors:**
- `400`: Missing householdId
- `403`: Not a member of household

**Notes:**
- Returns hierarchical structure with parent-child relationships
- Includes usage counts for better insights

---

### 4. Create Category

**POST** `/categories`

Create a new category (optionally with parent for subcategories).

**Authorization:** Bearer token required
**Required Role:** ADMIN or OWNER

**Request Body:**
```json
{
  "householdId": "cm3z8xy9k000008l70xh5d123",
  "name": "Produce",
  "icon": "🥬",  // Optional, max 10 characters
  "color": "#10b981",  // Optional, hex color
  "parentId": "cat-uuid-groceries"  // Optional, for subcategories
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "category": {
      "id": "cat-uuid-new",
      "householdId": "cm3z8xy9k000008l70xh5d123",
      "name": "Produce",
      "icon": "🥬",
      "color": "#10b981",
      "parentId": "cat-uuid-groceries",
      "createdAt": "2025-11-29T19:00:00Z"
    }
  }
}
```

**Validation:**
- `householdId`: Required, valid UUID
- `name`: Required, 1-100 characters
- `icon`: Optional, max 10 characters (usually emoji)
- `color`: Optional, hex color format (#RRGGBB)
- `parentId`: Optional, valid category UUID (must be in same household)

**Errors:**
- `400`: Validation error
- `403`: Not authorized (requires ADMIN or OWNER)
- `404`: Parent category not found

**Notes:**
- Supports hierarchical categories (parent-child)
- Useful for organizing subcategories (e.g., "Produce" under "Groceries")

---

### 5. Update Category

**PATCH** `/categories/:id`

Update category details.

**Authorization:** Bearer token required
**Required Role:** ADMIN or OWNER

**URL Parameters:**
- `id`: Category UUID

**Request Body:** (all fields optional)
```json
{
  "name": "Updated Category Name",
  "icon": "🎯",
  "color": "#ef4444",
  "parentId": "new-parent-uuid"  // or null to remove parent
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "category": {
      "id": "cat-uuid",
      "name": "Updated Category Name",
      "icon": "🎯",
      "color": "#ef4444",
      "parentId": "new-parent-uuid",
      "updatedAt": "2025-11-29T20:00:00Z"
    }
  }
}
```

**Validation:**
- `name`: 1-100 characters
- `icon`: Max 10 characters
- `color`: Hex color format (#RRGGBB)
- `parentId`: Valid category UUID or null

**Errors:**
- `400`: Validation error (e.g., category cannot be its own parent)
- `403`: Not authorized (requires ADMIN or OWNER)
- `404`: Category or parent category not found

**Notes:**
- Cannot set category as its own parent (circular reference prevention)

---

### 6. Delete Category

**DELETE** `/categories/:id`

Delete a category. Requires force flag if category is in use.

**Authorization:** Bearer token required
**Required Role:** ADMIN or OWNER

**URL Parameters:**
- `id`: Category UUID

**Query Parameters:**
- `force` (optional): Set to `true` to delete even if in use

**Example:** `/categories/cat-uuid?force=true`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "message": "Category deleted successfully"
  }
}
```

**Errors:**
- `400`: Category is being used (expenses or budgets reference it)
- `400`: Category has child categories (delete children first)
- `403`: Not authorized (requires ADMIN or OWNER)
- `404`: Category not found

**Notes:**
- Without `force=true`: Fails if category is used by any expense or budget
- With `force=true`: Deletes category and sets `categoryId` to null on expenses/budgets
- Must delete child categories first (cannot delete parent if children exist)

---

## Dashboard & Analytics

### 1. Get Monthly Summary

**GET** `/dashboard/monthly`

Get comprehensive monthly summary with trends, category breakdown, and member contributions.

**Authorization:** Bearer token required
**Required Role:** Any household member

**Query Parameters:**
- `householdId` (required): Household UUID
- `month` (optional): YYYY-MM format (defaults to current month)

**Example:** `/dashboard/monthly?householdId=cm3z8xy9k000008l70xh5d123&month=2025-11`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "period": {
      "month": 11,
      "year": 2025,
      "startDate": "2025-11-01T00:00:00Z",
      "endDate": "2025-11-30T23:59:59Z",
      "daysElapsed": 29,
      "totalDays": 30
    },
    "summary": {
      "totalExpenses": 2450.75,
      "totalIncome": 5000.00,
      "net": 2549.25,
      "totalBudgetAmount": 3000.00,
      "budgetSpent": 2450.75,
      "budgetRemaining": 549.25,
      "budgetUsagePercentage": 81.7
    },
    "categoryBreakdown": {
      "Groceries": 850.50,
      "Transportation": 320.00,
      "Utilities": 450.25,
      "Entertainment": 200.00,
      "Other": 630.00
    },
    "memberContributions": [
      {
        "userId": "user-uuid-1",
        "fullName": "John Smith",
        "totalExpenses": 1200.50,
        "expenseCount": 25
      },
      {
        "userId": "user-uuid-2",
        "fullName": "Jane Smith",
        "totalExpenses": 1250.25,
        "expenseCount": 30
      }
    ],
    "trends": {
      "comparedToPrevious": {
        "expenseChange": 5.2,  // percentage
        "incomeChange": -2.1,
        "netChange": -8.3
      },
      "dailyAverage": 84.51,
      "projectedMonthEnd": 2607.30
    }
  }
}
```

**Caching:** 5-minute TTL (NodeCache)

**Errors:**
- `400`: Validation error (invalid month format)
- `403`: Not a member of household

---

### 2. Get Household Overview

**GET** `/dashboard/household/:id`

Get household overview with stats and recent activity.

**Authorization:** Bearer token required
**Required Role:** Any household member

**URL Parameters:**
- `id`: Household UUID

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "household": {
      "id": "cm3z8xy9k000008l70xh5d123",
      "name": "Smith Family Budget",
      "memberCount": 4,
      "members": [
        {
          "id": "member-uuid-1",
          "userId": "user-uuid-1",
          "role": "OWNER",
          "user": {
            "id": "user-uuid-1",
            "fullName": "John Smith",
            "email": "john@example.com"
          }
        }
      ],
      "createdAt": "2025-11-01T00:00:00Z"
    },
    "stats": {
      "totalBudgets": 8,
      "totalExpenses": 156,
      "totalCategories": 12
    },
    "recentActivity": [
      {
        "id": "expense-uuid-1",
        "type": "expense",
        "description": "Grocery shopping",
        "amount": 45.99,
        "date": "2025-11-29T14:30:00Z",
        "createdBy": "John Smith"
      },
      {
        "id": "budget-uuid-1",
        "type": "budget",
        "description": "Created budget: Monthly Groceries",
        "amount": 500.00,
        "date": "2025-11-28T10:00:00Z",
        "createdBy": "Jane Smith"
      }
    ],
    "currentMonthSummary": {
      "totalExpenses": 2450.75,
      "totalIncome": 5000.00,
      "budgetUsagePercentage": 81.7
    }
  }
}
```

**Caching:** 5-minute TTL (NodeCache)

**Errors:**
- `403`: Not a member of household
- `404`: Household not found

---

### 3. Get Budget Health

**GET** `/dashboard/budget-health`

Get budget health indicators for all active budgets with projections.

**Authorization:** Bearer token required
**Required Role:** Any household member

**Query Parameters:**
- `householdId` (required): Household UUID

**Example:** `/dashboard/budget-health?householdId=cm3z8xy9k000008l70xh5d123`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "budgets": [
      {
        "id": "budget-uuid-1",
        "name": "Monthly Groceries",
        "amount": 500.00,
        "spent": 320.50,
        "remaining": 179.50,
        "percentage": 64.1,
        "healthStatus": "ON_TRACK",  // ON_TRACK, WARNING, or OVER_BUDGET
        "daysRemaining": 1,
        "daysElapsed": 29,
        "totalDays": 30,
        "projectedSpending": 331.03,
        "projectedOverage": 0,
        "category": {
          "name": "Groceries",
          "icon": "🛒"
        }
      },
      {
        "id": "budget-uuid-2",
        "name": "Entertainment",
        "amount": 200.00,
        "spent": 180.00,
        "remaining": 20.00,
        "percentage": 90.0,
        "healthStatus": "WARNING",
        "daysRemaining": 1,
        "daysElapsed": 29,
        "totalDays": 30,
        "projectedSpending": 186.21,
        "projectedOverage": 0
      },
      {
        "id": "budget-uuid-3",
        "name": "Dining Out",
        "amount": 300.00,
        "spent": 350.00,
        "remaining": -50.00,
        "percentage": 116.7,
        "healthStatus": "OVER_BUDGET",
        "daysRemaining": 1,
        "daysElapsed": 29,
        "totalDays": 30,
        "projectedSpending": 362.07,
        "projectedOverage": 62.07
      }
    ],
    "summary": {
      "total": 3,
      "onTrack": 1,
      "warning": 1,
      "overBudget": 1
    },
    "grouped": {
      "ON_TRACK": [
        { "id": "budget-uuid-1", "name": "Monthly Groceries" }
      ],
      "WARNING": [
        { "id": "budget-uuid-2", "name": "Entertainment" }
      ],
      "OVER_BUDGET": [
        { "id": "budget-uuid-3", "name": "Dining Out" }
      ]
    }
  }
}
```

**Health Status Definitions:**
- **ON_TRACK:** Spending ≤ 80% of budget
- **WARNING:** Spending > 80% and ≤ 100% of budget
- **OVER_BUDGET:** Spending > 100% of budget

**Caching:** 5-minute TTL (NodeCache)

**Errors:**
- `400`: Missing householdId
- `403`: Not a member of household

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| `200` | OK | Successful GET, PATCH, DELETE |
| `201` | Created | Successful POST (resource created) |
| `400` | Bad Request | Validation error, missing required fields |
| `401` | Unauthorized | Missing or invalid JWT token |
| `403` | Forbidden | Insufficient permissions, not a household member |
| `404` | Not Found | Resource doesn't exist |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Unexpected server error |

### Error Response Examples

#### Validation Error (400)
```json
{
  "success": false,
  "error": "Validation failed: name is required"
}
```

#### Unauthorized (401)
```json
{
  "success": false,
  "error": "Invalid or expired token"
}
```

#### Forbidden (403)
```json
{
  "success": false,
  "error": "Insufficient permissions. ADMIN or OWNER role required."
}
```

#### Not Found (404)
```json
{
  "success": false,
  "error": "Budget not found"
}
```

#### Rate Limit (429)
```json
{
  "success": false,
  "error": "Too many requests. Please try again later.",
  "retryAfter": 60
}
```

---

## Testing Guide

### Prerequisites
1. **Running server:** `npm run dev` (port 5000)
2. **Valid JWT token:** Obtain from `/auth/login` endpoint
3. **Testing tool:** Postman, Thunder Client, or curl

### Step-by-Step Testing Flow

#### 1. Authentication
```bash
# Login to get JWT token
POST http://localhost:5000/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123"
}

# Save the returned token for all subsequent requests
```

#### 2. Create Household
```bash
POST http://localhost:5000/households
Authorization: Bearer <your-token>
Content-Type: application/json

{
  "name": "Test Household"
}

# Save the returned householdId
```

#### 3. Seed Categories
```bash
POST http://localhost:5000/categories/seed
Authorization: Bearer <your-token>
Content-Type: application/json

{
  "householdId": "<your-household-id>"
}

# Save some categoryId values
```

#### 4. Create Budget
```bash
POST http://localhost:5000/budgets
Authorization: Bearer <your-token>
Content-Type: application/json

{
  "householdId": "<your-household-id>",
  "name": "Test Budget",
  "amount": 1000.00,
  "period": "MONTHLY",
  "startDate": "2025-11-01T00:00:00Z",
  "endDate": "2025-11-30T23:59:59Z",
  "categoryId": "<a-category-id>"
}

# Save the returned budgetId
```

#### 5. Create Expense
```bash
POST http://localhost:5000/expenses
Authorization: Bearer <your-token>
Content-Type: application/json

{
  "householdId": "<your-household-id>",
  "amount": 50.00,
  "type": "EXPENSE",
  "description": "Test expense",
  "budgetId": "<your-budget-id>",
  "categoryId": "<a-category-id>",
  "tags": ["test"]
}
```

#### 6. Test Dashboard
```bash
# Monthly Summary
GET http://localhost:5000/dashboard/monthly?householdId=<your-household-id>&month=2025-11
Authorization: Bearer <your-token>

# Budget Health
GET http://localhost:5000/dashboard/budget-health?householdId=<your-household-id>
Authorization: Bearer <your-token>
```

### Multi-Tenancy Testing

Test data isolation between households:

1. Create two households
2. Create budgets/expenses in each
3. Verify you can't access data from one household using another household's ID
4. Invite a second user to one household
5. Verify the second user can only see data from households they're members of

### Authorization Testing

Test role-based permissions:

1. **As OWNER:**
   - Create budget ✅
   - Delete household ✅
   - Change member roles ✅

2. **As ADMIN:**
   - Create budget ✅
   - Delete household ❌ (should fail with 403)
   - Change member roles ❌ (should fail with 403)

3. **As MEMBER:**
   - Create expense ✅
   - Create budget ❌ (should fail with 403)
   - Delete household ❌ (should fail with 403)

### Real-time Testing

Using browser console with Supabase JS:

```javascript
// Subscribe to household channel
const channel = supabase
  .channel('household:YOUR_HOUSEHOLD_ID')
  .on('broadcast', { event: 'expense:created' }, ({ payload }) => {
    console.log('New expense:', payload)
  })
  .subscribe()

// Then create an expense via API and verify the event is received
```

### Postman Collection Variables

Set these environment variables in Postman:

```
base_url = http://localhost:5000
token = <your-jwt-token>
householdId = <your-household-id>
budgetId = <your-budget-id>
categoryId = <your-category-id>
expenseId = <your-expense-id>
```

---

## Additional Resources

- **Swagger Documentation:** `http://localhost:5000/api-docs` (when server is running)
- **GitHub Repository:** https://github.com/aasni089/zero-friction-budget
- **Prisma Schema:** `backend/prisma/schema.prisma`
- **Real-time Service:** `backend/services/realtime.js`
- **Middleware:** `backend/middleware/household-auth.js`

---

**Last Updated:** November 29, 2025
**API Version:** Phase 2 (33 endpoints)
**Status:** ✅ Production Ready
