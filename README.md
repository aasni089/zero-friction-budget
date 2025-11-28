# Budget Tracker - Web-First Application

A household budget tracking application with real-time collaboration, built web-first with plans to expand to mobile later.

## Overview

**Key Features:**
- 💰 ChatGPT-style centered expense input
- 👥 Multi-household support with role-based permissions
- ⚡ Real-time updates across household members
- 📊 Monthly budget tracking and dashboards
- 🎨 Simple, clean UI focused on ease of use

**What Makes This Different:**
- Leverages production-ready auth from [proptech project](https://github.com/aasni089/proptech)
- Web-first approach (mobile apps later)
- Real-time collaboration built-in
- Saves 6-8 weeks of development time by reusing battle-tested components

---

## Technology Stack

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Database**: Supabase (PostgreSQL + real-time)
- **ORM**: Prisma
- **Auth**: JWT (OTC, Google OAuth, 2FA with trusted devices)
- **Email**: Resend
- **Validation**: Zod

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **UI Library**: React 18
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui (Radix UI)
- **State**: Zustand with localStorage persistence
- **Notifications**: Sonner (toast)

### Infrastructure
- **Database**: Supabase (managed PostgreSQL)
- **Development**: Docker Compose
- **Version Control**: Git + GitHub

---

## Project Structure

```
zero_friction_budget/
├── backend/              # Node.js + Express backend
│   ├── config/          # Configuration files
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Auth, validation, security
│   ├── models/          # Prisma models
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── utils/           # Helper functions
│   └── prisma/          # Database schema and migrations
│
├── frontend/            # Next.js 14 frontend
│   ├── app/            # Next.js App Router pages
│   ├── components/     # React components
│   ├── lib/            # Utilities and API clients
│   ├── hooks/          # Custom React hooks
│   └── public/         # Static assets
│
├── plan.md             # Detailed development plan
└── README.md           # This file
```

---

## Getting Started

### Prerequisites

- Node.js 20+ and npm
- Docker and Docker Compose (for local development)
- Git
- Supabase account (free tier works)
- Resend account (for emails)
- Google Cloud Console (for OAuth)

### Installation

**Note:** Currently in Phase 1 - backend and frontend directories will be created during setup.

1. **Clone the repository**
   ```bash
   cd ~/Documents/projects
   git clone https://github.com/aasni089/zero-friction-budget.git
   cd zero-friction-budget
   ```

2. **See [plan.md](./plan.md) for detailed setup instructions**

---

## Development Phases

This project is being built in 5 phases (see [Master Issue #13](https://github.com/aasni089/zero-friction-budget/issues/13)):

- [ ] **Phase 1**: Project Setup & Backend Foundation (3-4 days)
- [ ] **Phase 2**: Backend API Development (5-7 days)
- [ ] **Phase 3**: Frontend Development (7-10 days)
- [ ] **Phase 4**: Real-time & Enhancements (3-4 days)
- [ ] **Phase 5**: Testing & Deployment (2-3 days)

**Total MVP Timeline**: ~3-4 weeks

---

## Key Concepts

### Households
- Users can join **multiple households** (e.g., personal, family, roommates)
- Each household has members with roles: OWNER, ADMIN, MEMBER, VIEWER
- Budgets and expenses belong to households

### Budgets
- **Household-level** budgets (shared among members)
- Support different periods: Monthly, Quarterly, Yearly, Custom
- Track spending against budget limits
- Color-coded progress: Green (<70%), Yellow (70-90%), Red (≥90%)

### Expenses
- Created by individual users
- Belong to a household
- Optional category and budget assignment
- Required fields: amount
- Optional fields: category, description, date
- Real-time sync across household members

### Authentication
- One-Time Code (OTC) via email/SMS
- Google OAuth
- Two-Factor Authentication (2FA) with trusted devices
- All reused from proptech project

---

## Data Model

### Core Entities

**User** → Can belong to multiple households
**Household** → Contains members, budgets, expenses, categories
**HouseholdMember** → Junction table linking users to households with roles
**Budget** → Belongs to household, tracks spending limits
**Category** → Household-specific, used to classify expenses
**Expense** → Created by user, belongs to household, optional budget/category
**RecurringExpense** → Auto-generates expenses on schedule

See [plan.md](./plan.md) for detailed data model.

---

## Leveraging Proptech Project

This project reuses production-ready components from the [proptech project](https://github.com/aasni089/proptech):

**Reused (90-100%):**
- Complete authentication system (OTC, OAuth, 2FA)
- User/Account/Session/Token models
- Email service (Resend integration)
- Middleware stack (auth, rate-limit, security)
- Prisma setup and patterns
- Frontend auth components
- shadcn/ui component library
- Zustand state management
- API client architecture

**Adapted:**
- Data models (budget domain instead of property domain)
- API routes (households, budgets, expenses)
- Frontend pages (budget-specific UI)

---

## Development Workflow

1. Work on one phase at a time (see GitHub issues)
2. Complete all tasks in the phase
3. Update GitHub issue with progress
4. Clear context and move to next phase

---

## Resources

- [Detailed Plan](./plan.md) - Complete development plan with all phases
- [Master Issue #13](https://github.com/aasni089/zero-friction-budget/issues/13) - Tracking issue
- [Proptech Project](https://github.com/aasni089/proptech) - Source of reusable components
- [Supabase Docs](https://supabase.com/docs)
- [Next.js 14 Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [shadcn/ui](https://ui.shadcn.com)

---

## Contributing

This is a personal project, but contributions and suggestions are welcome via GitHub issues.

---

## License

TBD

---

_Last Updated: 2025-11-28_
