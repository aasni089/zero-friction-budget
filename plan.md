# Budget Tracker - Web-First Development Plan

## Project Overview

A household budget tracking application with real-time collaboration, built web-first with plans to expand to mobile later. The app leverages authentication and backend infrastructure from the [proptech project](https://github.com/aasni089/proptech) to accelerate development.

**Key Features:**
- ChatGPT-style centered expense input
- Multi-household support with role-based permissions
- Real-time updates across household members
- Monthly budget tracking and dashboards
- Simple, clean UI focused on ease of use

---

## Technology Stack

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Database**: Supabase (PostgreSQL + real-time subscriptions)
- **ORM**: Prisma
- **Authentication**: JWT with multiple methods (OTC, Google OAuth, 2FA)
- **Email**: Resend
- **Validation**: Zod
- **Rate Limiting**: express-rate-limit

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **UI Library**: React 18
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui (Radix UI)
- **State Management**: Zustand with localStorage persistence
- **API Client**: Domain-specific fetch clients
- **Notifications**: Sonner (toast notifications)

### Infrastructure
- **Database Hosting**: Supabase (managed PostgreSQL)
- **Local Development**: Docker Compose
- **Version Control**: Git + GitHub
- **Containerization**: Docker

---

## Architecture Decisions

### Why Web-First?
- Faster initial development and iteration
- Easier deployment and updates
- Broader accessibility (no app store approval)
- Mobile apps can be added later using same backend

### Why Supabase?
- **Real-time built-in**: Live updates when household members add expenses
- **PostgreSQL foundation**: Relational data with ACID guarantees
- **Cost-effective**: Generous free tier (500MB DB, 50K MAU)
- **Familiar tooling**: Can use Prisma ORM (same as proptech)
- **No tech debt**: Enterprise-grade PostgreSQL with extras
- **Fast development**: Auth, storage, and real-time out of the box

### Leveraging Proptech Project
The proptech project provides production-ready components that save 6-8 weeks of development:

**Reusable (90-100%):**
- Complete authentication system (OTC, Google OAuth, 2FA with trusted devices)
- User/Account/Session/Token data models
- Email service (Resend integration with templates)
- Middleware stack (auth, rate-limiting, validation, security)
- Prisma setup and migration patterns
- Frontend auth components and flows
- shadcn/ui component library (25+ components)
- Zustand state management patterns
- API client architecture
- Docker development environment

**Requires Adaptation:**
- Replace property-specific models with budget models
- Adapt routes/controllers for budget domain
- Extend User model for household features

---

## Data Model

### Core Entities

#### User
- Authentication fields (email, phone, emailVerified)
- Personal info (name, avatar)
- Auth preferences (preferredAuthMethod, twoFAEnabled)
- Role-based access (USER, ADMIN)
- Status (ACTIVE, INACTIVE, SUSPENDED)

#### Household
- Basic info (name, ownerId)
- Members via junction table (HouseholdMember)
- Multiple budgets
- Owned by one user, many members

#### HouseholdMember
- Links User to Household
- Role (OWNER, ADMIN, MEMBER, VIEWER)
- Permissions (JSON)
- Join date

#### Budget
- Belongs to Household
- Name, amount, period (MONTHLY, QUARTERLY, YEARLY, CUSTOM)
- Start/end dates
- Optional category link
- Tracks expenses

#### Category
- Name, icon, color
- Household-specific (custom categories per household)
- Hierarchical (parent/child relationships)
- Used for expense classification

#### Expense (Transaction)
- Belongs to User (who created it)
- Belongs to Household
- Optional Budget link
- Optional Category link
- Amount, description, date
- Type (INCOME, EXPENSE, TRANSFER)
- Recurring support
- Attachment URLs (receipt photos)
- Tags

#### RecurringExpense
- Frequency (DAILY, WEEKLY, MONTHLY, etc.)
- Amount, description, category
- Start/end dates
- Auto-generation schedule (nextRun, lastRun)

### Auth Models (from Proptech)
- Account (OAuth providers)
- Session
- VerificationToken
- RevokedToken (JWT blacklist)
- TrustedDevice (2FA bypass)
- NotificationPreference

---

## Development Phases

### Phase 1: Project Setup & Backend Foundation (3-4 days)

**1.1 Initialize Project Structure**
- Create `/backend` and `/frontend` directories
- Copy proptech backend as starting point
- Remove property-specific code
- Initialize Next.js 14 frontend
- Setup Docker Compose

**1.2 Database Setup**
- Create Supabase project
- Design Prisma schema (User, Household, Budget, Expense, Category, Auth tables)
- Configure Prisma to work with Supabase
- Run migrations
- Seed default categories

**1.3 Authentication System**
- Copy auth controllers from proptech (OTC, OAuth, 2FA, trusted devices)
- Remove magic link authentication
- Copy middleware (auth, rate-limiting, security)
- Copy email templates and Resend integration
- Setup session management

---

### Phase 2: Backend API Development (5-7 days)

**2.1 Core API Routes**
- **Auth** (`/auth/*`): Login, OAuth, 2FA, logout, profile
- **Households** (`/households`): CRUD, invitations, member management
- **Budgets** (`/budgets`): CRUD, progress tracking, rollover
- **Expenses** (`/expenses`): CRUD with filters, bulk operations
- **Categories** (`/categories`): CRUD, defaults, hierarchy
- **Dashboard** (`/dashboard`): Monthly summary, trends, member contributions

**2.2 Real-time Features**
- Setup Supabase real-time subscriptions
- Broadcast expense additions
- Live budget progress updates

---

### Phase 3: Frontend Development (7-10 days)

**3.1 Project Setup**
- Initialize Next.js 14 with TypeScript
- Setup Tailwind CSS
- Install shadcn/ui components
- Setup Zustand store
- Create API client architecture

**3.2 Authentication Flow**
- Copy auth components from proptech
- Login page (OTC + Google OAuth)
- 2FA flows
- Protected routes
- Auth state management

**3.3 Main Layout & Navigation**
- Expandable sidebar (profile, household selector, nav links)
- Responsive design
- Top bar with household context

**3.4 Expense Input (ChatGPT-style)**
- Centered input field on home page
- Amount, category, description, date
- Submit on Enter
- Toast notifications
- Real-time expense list update

**3.5 Budgets Page**
- List of budgets (cards/table)
- Progress bars
- Create/edit/delete modals
- Period filters

**3.6 Monthly Dashboard**
- Summary cards (total expenses, remaining budget, top categories)
- Charts (spending by category, daily trends, budget vs actual)
- Recent transactions list

**3.7 Settings Pages**
- User Profile (name, email, avatar)
- Account Settings (auth preferences, 2FA, trusted devices)
- Household Settings (members, roles, invitations)

**3.8 UI Components**
- Copy shadcn/ui components from proptech
- Custom budget-specific components
- Loading states and error boundaries

---

### Phase 4: Real-time & Enhancements (3-4 days)

**4.1 Real-time Updates**
- Setup Supabase client in frontend
- Subscribe to expense changes
- Optimistic UI updates
- Live notifications

**4.2 Recurring Expenses**
- Backend scheduler for recurring expense generation
- UI for managing recurring expenses

**4.3 Categories & Customization**
- Default category library
- Custom category creation with icon picker
- Category analytics

---

### Phase 5: Testing & Deployment (2-3 days)

**5.1 Testing**
- Authentication flows
- Household multi-tenancy (data isolation)
- Real-time updates
- Budget calculations
- Cross-browser testing

**5.2 Deployment Preparation**
- Environment configuration
- Docker Compose for production
- Database migrations
- Security audit

**5.3 Documentation**
- API documentation (Swagger)
- Setup instructions (README)
- Environment variables guide

---

## Timeline Estimate

- **Phase 1**: 3-4 days
- **Phase 2**: 5-7 days
- **Phase 3**: 7-10 days
- **Phase 4**: 3-4 days
- **Phase 5**: 2-3 days

**Total MVP**: ~3-4 weeks

**Time Saved by Reusing Proptech**: 6-8 weeks

---

## Feature Priorities

### MVP (Must Have)
- [x] User authentication (OTC, Google OAuth, 2FA)
- [ ] Household creation and member invitations
- [ ] Expense entry (amount, category, description, date)
- [ ] Budget creation and tracking
- [ ] Monthly dashboard with basic charts
- [ ] Real-time updates for household members
- [ ] User/account/household settings

### V2 (Should Have)
- [ ] Recurring expenses
- [ ] Receipt photo uploads
- [ ] Category customization and hierarchy
- [ ] Budget templates
- [ ] Export data (CSV, PDF)
- [ ] Email notifications for budget limits
- [ ] Expense search and advanced filters

### V3 (Nice to Have)
- [ ] Mobile apps (iOS, Android)
- [ ] AI-powered expense categorization
- [ ] Bill splitting within household
- [ ] Multi-currency support
- [ ] Bank account integration (Plaid)
- [ ] Savings goals
- [ ] Financial insights and recommendations

---

## Security Considerations

- JWT authentication with token expiration
- Token revocation list for logout
- Rate limiting on all endpoints (5 req/5min for auth)
- Two-factor authentication with trusted devices
- Row-level security in Supabase
- CORS configuration
- Helmet security headers
- Input validation with Zod
- SQL injection prevention via Prisma
- XSS prevention
- CSRF protection

---

## Deployment Strategy

### Development
- Local PostgreSQL via Docker Compose
- Local Supabase CLI for real-time testing
- Hot reload for frontend and backend

### Staging
- Supabase staging project
- Vercel preview deployments for frontend
- Railway/Render for backend staging

### Production
- Supabase production project
- Vercel for frontend hosting
- Railway/Render/Fly.io for backend hosting
- CloudFlare for CDN and DDoS protection
- Sentry for error tracking
- CI/CD via GitHub Actions

---

## Project Name Ideas

The current repo is `zero-friction-budget` but we're open to renaming. Ideas:

- **budget-buddy** - Friendly and approachable
- **household-ledger** - Professional, clear purpose
- **expense-share** - Emphasizes collaboration
- **pennypilot** - Catchy, guides you through budgeting
- **splitwise-alternative** - (if focusing on household splitting)
- **budget-hive** - Collaboration + organization
- **cashflow-tracker** - Professional, clear
- **spend-together** - Social, household-focused

Current preference: TBD

---

## Next Steps

1. ✅ Close old Flutter/Firebase issues
2. ✅ Create this plan.md
3. [ ] Initialize project structure
4. [ ] Copy and adapt proptech backend
5. [ ] Setup Supabase project
6. [ ] Design and implement Prisma schema
7. [ ] Build backend API routes
8. [ ] Initialize Next.js frontend
9. [ ] Implement authentication UI
10. [ ] Build expense input and dashboard

---

## Resources

- [Proptech Project](https://github.com/aasni089/proptech)
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js 14 Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Zustand State Management](https://zustand-demo.pmnd.rs)

---

_Last Updated: 2025-11-28_
