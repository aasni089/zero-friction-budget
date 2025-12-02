# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Zero Friction Budget** is a household budget tracking application with real-time collaboration, built web-first with plans to expand to mobile later. This project leverages production-ready authentication infrastructure from the [proptech project](https://github.com/aasni089/proptech) to accelerate development.

**Tech Stack:**
- **Backend**: Node.js + Express + Prisma + Supabase (PostgreSQL)
- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Auth**: JWT (OTC, Google OAuth, 2FA with trusted devices)
- **State**: Zustand with localStorage persistence
- **Real-time**: Supabase real-time subscriptions

## Development Commands

### Backend (from `/backend` directory)

```bash
# Development
npm run dev              # Start dev server with nodemon

# Database
npm run migrate          # Run Prisma migrations
npm run prisma:generate  # Generate Prisma client
npm run prisma:studio    # Open Prisma Studio GUI
npm run seed             # Seed database with default data

# Testing & Quality
npm test                 # Run Jest tests
npm run lint             # Run ESLint with auto-fix
```

### Frontend (from `/frontend` directory)

```bash
# Development
npm run dev              # Start Next.js dev server (port 3000)

# Production
npm run build            # Build for production
npm start                # Start production server

# Quality
npm run lint             # Run ESLint
```

### Docker

```bash
# From project root
docker-compose up -d     # Start all services (if configured)
docker-compose down      # Stop all services
```

## Architecture Overview

### Multi-Household System

This is a **multi-tenant application** where users can belong to multiple households:

1. **User** → Can be a member of multiple households
2. **Household** → Container for members, budgets, expenses, categories
3. **HouseholdMember** → Junction table with role-based permissions (OWNER, ADMIN, MEMBER, VIEWER)
4. **Budget** → Household-specific budgets with line item support via `BudgetCategory`
5. **Expense** → Created by users, belongs to household, optionally linked to budget/category
6. **Category** → Household-specific with hierarchical support (parent/child)

**Critical:** All queries MUST filter by `householdId` to ensure data isolation between households.

### Backend Architecture

**Structure:**
```
backend/
├── config/           # Database, auth, passport, logger, Supabase
├── controllers/      # Request handlers (auth, budget, expense, household, category, dashboard)
├── middleware/       # Auth, rate-limit, validation, household-auth, upload, CSRF
├── routes/           # API route definitions (auth, budgets, expenses, households, categories, dashboard)
├── services/         # Business logic (user, upload, realtime)
├── utils/            # Helpers (email, cleanup, encryption)
└── prisma/           # Schema and migrations
```

**Key Patterns:**
- **Auth**: JWT-based with token revocation list (`RevokedToken`)
- **Middleware Chain**: `authenticateToken` → `requireHouseholdAccess` → controller
- **Rate Limiting**: Disabled in dev, enabled in production (5 req/5min for auth)
- **Validation**: Zod schemas for input validation
- **Logging**: Winston with structured logging

**Important Files:**
- `backend/server.js` - Main Express app with all route registration
- `backend/prisma/schema.prisma` - Complete data model
- `backend/middleware/auth.js` - JWT authentication
- `backend/middleware/household-auth.js` - Household access control

### Frontend Architecture

**Structure:**
```
frontend/
├── app/                    # Next.js 14 App Router
│   ├── (auth)/            # Auth pages (login, callback, verify, verify-2fa)
│   └── (dashboard)/       # Protected pages (dashboard, budgets, expense, track, settings)
├── components/            # React components
│   ├── budget/           # Budget-specific components
│   ├── dashboard/        # Dashboard charts and widgets
│   ├── expense/          # Expense input and display
│   ├── household/        # Household management
│   ├── layout/           # Nav, sidebar, layout components
│   ├── ui/               # shadcn/ui components
│   └── ErrorBoundary.tsx
├── lib/
│   ├── api/              # Domain-specific API clients
│   │   ├── client.ts           # Base API client with auth
│   │   ├── auth-client.ts      # Auth operations
│   │   ├── household-client.ts # Household CRUD
│   │   ├── budget-client.ts    # Budget operations
│   │   ├── expense-client.ts   # Expense operations
│   │   └── category-client.ts  # Category operations
│   ├── stores/           # Zustand state management
│   │   ├── auth.ts       # Auth state with localStorage persistence
│   │   └── ui.ts         # UI state (sidebar, modals)
│   ├── supabase.ts       # Supabase client for real-time
│   └── utils.ts          # Utility functions (cn, formatters)
└── hooks/                # Custom React hooks
```

**Key Patterns:**
- **API Clients**: Domain-specific clients extend base client with auth headers
- **Auth Flow**: Token stored in Zustand → localStorage → sent as Bearer token
- **Protected Routes**: Layout-level auth checks redirect to `/login` if unauthorized
- **Real-time**: Supabase subscriptions for live expense updates
- **Forms**: react-hook-form + Zod validation
- **Notifications**: Sonner toast for user feedback

### Data Model Key Points

**User Authentication:**
- Supports OTC (one-time code), Google OAuth, and 2FA
- `TrustedDevice` allows 2FA bypass for recognized devices
- `RevokedToken` maintains JWT blacklist for logout
- `preferredAuthMethod` and `twoFAEnabled` control auth flows

**Budget System:**
- Budgets can be simple (single amount) or multi-line (via `BudgetCategory`)
- `BudgetCategory` links categories to budgets with `allocatedAmount`
- Periods: WEEKLY, BIWEEKLY, MONTHLY, QUARTERLY, YEARLY, CUSTOM
- Expenses optionally link to budgets for tracking

**Expenses:**
- Required: `amount`, `userId`, `householdId`
- Optional: `budgetId`, `categoryId`, `description`, `date`
- Types: INCOME, EXPENSE, TRANSFER
- Support for recurring expenses via `RecurringExpense`

**Categories:**
- Household-specific (not global)
- Hierarchical support via `parentId` (for subcategories)
- Used for both budgets and expenses
- Include `icon` (emoji) and `color` (hex) for UI

## Development Workflow

### Phase Tracking

This project is being built in 5 phases (see GitHub issue #13):
- Phase 1: ✅ Project Setup & Backend Foundation
- Phase 2: ✅ Backend API Development
- Phase 3: 🚧 Frontend Development (current)
- Phase 4: ⏳ Real-time & Enhancements
- Phase 5: ⏳ Testing & Deployment

**Working on a feature:**
1. Check current phase in `plan.md` and GitHub issues
2. Implement changes following existing patterns
3. Test against running backend (port 4000)
4. Ensure household data isolation in multi-tenant scenarios

### Task Completion Workflow

**IMPORTANT:** After completing each task within a phase:

1. **Update GitHub Issue**: Go to the phase's GitHub issue and check off the completed task(s)
2. **Commit Changes**: Create a descriptive commit with changes made
3. **Push to GitHub**: Push the commit to the repository
4. **Provide Continuation Prompt**: Generate a concise prompt for the next task that includes:
   - What was just completed
   - What the next task is
   - All context required to complete the next task (since context will be cleared)
   - Any relevant file paths, API endpoints, or implementation details needed

**Example continuation prompt:**
```
Just completed: Implemented budget progress bars with color-coded indicators in frontend/components/budget/BudgetCard.tsx

Next task: Add budget creation modal with form validation

Context needed:
- Budget model requires: name, amount, period, startDate, householdId
- Use frontend/lib/api/budget-client.ts createBudget() method
- Follow pattern from expense form in frontend/components/expense/ExpenseForm.tsx
- Use react-hook-form + Zod validation
- Modal should use shadcn/ui Dialog component
- Trigger from budgets page "Create Budget" button
```

### Quality Over Speed

**This project prioritizes high-quality implementation over speed:**
- Write clean, maintainable code following existing patterns
- Add proper error handling and loading states
- Test thoroughly before marking tasks complete
- Ensure TypeScript types are accurate and helpful
- Follow accessibility best practices
- Add meaningful comments for complex logic
- Validate all user inputs with Zod schemas

### Authentication Flow

**Backend:**
1. User submits email/phone → generates OTC → sends via Resend/SMS
2. User submits OTC → validates → returns JWT
3. Optional: 2FA challenge if enabled → validates → returns JWT
4. Google OAuth: Passport handles flow → redirects with JWT

**Frontend:**
1. Login form → calls auth-client → stores token in Zustand + localStorage
2. All API calls include `Authorization: Bearer <token>` header
3. Protected routes check `authStore.isAuthenticated`
4. Logout → calls logout endpoint → clears token → redirects

### Household Context

**Critical Pattern:**
- Frontend maintains "active household" in state/localStorage
- All API calls include `householdId` in request body or query params
- Backend middleware validates user has access to household
- Switching households updates context and refetches data

### Real-time Updates

**Implementation:**
- Supabase client subscribes to expense changes filtered by `householdId`
- On insert/update/delete → update local state optimistically
- Toast notifications inform users of changes made by others
- Used for live budget progress updates

## Common Patterns

### Adding a New API Endpoint

1. **Define route** in `backend/routes/<domain>.js`
2. **Create controller** in `backend/controllers/<domain>.js`
3. **Add middleware** if needed (auth, household access, validation)
4. **Update frontend client** in `frontend/lib/api/<domain>-client.ts`
5. **Use in components** via API client

### Adding a New Page

1. **Create route** in `frontend/app/(dashboard)/<page>/page.tsx`
2. **Add navigation** in `frontend/components/layout/Sidebar.tsx`
3. **Fetch data** using API clients in page component
4. **Handle loading/error** states with ErrorBoundary

### Creating a New Component

1. **Place in appropriate directory** (`components/budget`, `components/ui`, etc.)
2. **Use shadcn/ui primitives** when possible
3. **Follow TypeScript conventions** (explicit props interface)
4. **Add proper error boundaries** for resilience

## Security Considerations

- **JWT Expiry**: Tokens expire based on `authConfig.jwt.expiresIn`
- **Token Revocation**: Logout adds token to `RevokedToken` table
- **Rate Limiting**: Auth endpoints limited to 5 req/5min in production
- **Household Isolation**: Middleware enforces user membership before data access
- **Input Validation**: Zod schemas validate all user inputs
- **CORS**: Configured for allowed origins only
- **Helmet**: Security headers set via helmet middleware

## Known Issues & Gotchas

1. **Household Context Required**: All budget/expense/category operations require `householdId`
2. **Token Storage**: Frontend stores tokens in both Zustand and localStorage for persistence
3. **Real-time Filters**: Supabase subscriptions must filter by `householdId` to avoid cross-household leaks
4. **Migration Order**: Run `prisma migrate dev` before `prisma generate`
5. **Environment Variables**: Both backend and frontend need separate `.env` files

## Environment Setup

**Backend `.env` required:**
- `DATABASE_URL` - Supabase PostgreSQL connection string
- `DIRECT_URL` - Direct database connection (for migrations)
- `JWT_SECRET` - Secret for signing JWTs
- `RESEND_API_KEY` - For sending emails
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - For OAuth
- `FRONTEND_URL` - Frontend URL for CORS and redirects
- `ALLOWED_ORIGINS` - Comma-separated allowed origins

**Frontend `.env.local` required:**
- `NEXT_PUBLIC_API_URL` - Backend API URL (e.g., http://localhost:4000)
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key

## Resources

- [Plan Document](./plan.md) - Detailed development plan
- [Prisma Schema](./backend/prisma/schema.prisma) - Complete data model
- [Proptech Project](https://github.com/aasni089/proptech) - Source of auth components
- [Supabase Docs](https://supabase.com/docs) - Real-time subscriptions
- [Next.js 14 Docs](https://nextjs.org/docs) - App Router patterns
- [shadcn/ui](https://ui.shadcn.com) - Component library
