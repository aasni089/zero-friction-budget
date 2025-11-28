# Budget Tracker Backend

Node.js + Express.js backend for the Budget Tracker application with multi-household support and real-time collaboration.

## Features

- **Authentication**: OTC (email/SMS), Google OAuth, 2FA with trusted devices
- **Multi-household**: Users can belong to multiple households
- **Real-time**: Supabase real-time subscriptions for live updates
- **Role-based Access**: OWNER, ADMIN, MEMBER, VIEWER roles
- **Budget Tracking**: Monthly/quarterly/yearly budgets with progress tracking
- **Expense Management**: Quick expense entry with optional categorization

## Tech Stack

- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Database**: Supabase (PostgreSQL)
- **ORM**: Prisma
- **Authentication**: JWT with Passport.js
- **Email**: Resend
- **Validation**: express-validator

## Prerequisites

- Node.js 20+ and npm
- Supabase account (free tier works)
- Resend account for emails
- Google Cloud Console for OAuth (optional)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

**Required Variables:**
- `DATABASE_URL` - Supabase PostgreSQL connection string
- `JWT_SECRET` - Secret for JWT tokens (min 32 characters)
- `RESEND_API_KEY` - API key from Resend
- `ENCRYPTION_KEY` - 32-byte hex key for encryption

**Optional Variables:**
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - For Google OAuth
- `TWILIO_*` - For SMS-based 2FA

### 3. Setup Database

**Get Supabase Connection String:**
1. Create a Supabase project at https://supabase.com
2. Go to Settings → Database → Connection string
3. Copy the URI connection string
4. Update `DATABASE_URL` in `.env`

**Run Migrations:**

```bash
npm run prisma:generate
npm run migrate
```

**Seed Database:**

```bash
npm run seed
```

### 4. Start Development Server

```bash
npm run dev
```

Server runs on `http://localhost:5000`

## Scripts

- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server
- `npm run migrate` - Run Prisma migrations
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:studio` - Open Prisma Studio
- `npm run seed` - Seed database
- `npm run lint` - Lint and fix code
- `npm test` - Run tests

## Project Structure

```
backend/
├── config/          # Configuration files (auth, database, logger)
├── controllers/     # Request handlers
│   ├── auth/       # Authentication controllers
│   ├── admin/      # Admin controllers
│   ├── profile/    # User profile controllers
│   └── upload/     # File upload controllers
├── middleware/      # Express middleware
│   ├── auth.js     # JWT authentication
│   ├── rate-limit.js
│   └── validator/  # Request validation
├── routes/          # API routes
├── services/        # Business logic
├── utils/           # Helper functions
├── prisma/          # Prisma schema and migrations
│   ├── schema.prisma
│   └── seed.js
└── server.js        # Entry point
```

## API Documentation

Once the server is running, visit:
- Swagger UI: `http://localhost:5000/api-docs`

## Authentication Flow

### One-Time Code (OTC)
1. POST `/auth/login-code` - Request OTC via email/SMS
2. POST `/auth/verify-login-code` - Verify OTC and get JWT

### Google OAuth
1. GET `/auth/google` - Redirect to Google
2. GET `/auth/google/callback` - Handle callback

### Two-Factor Authentication (2FA)
1. POST `/auth/2fa/configure` - Setup 2FA
2. POST `/auth/2fa/verify` - Verify 2FA code
3. POST `/auth/2fa/toggle` - Enable/disable 2FA

### Protected Routes
Include JWT token in Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Database Schema

See `prisma/schema.prisma` for full schema.

**Core Models:**
- `User` - User accounts
- `Household` - Household groups
- `HouseholdMember` - User-household memberships
- `Budget` - Budget limits
- `Category` - Expense categories
- `Expense` - Expense transactions
- `RecurringExpense` - Recurring expenses

## Environment Variables

See `.env.example` for all available environment variables.

## Development Notes

- Auth system adapted from [proptech project](https://github.com/aasni089/proptech)
- Uses Supabase for real-time features (not configured yet in Phase 1)
- Magic link authentication removed (not needed for this project)
- Elasticsearch removed (not needed for MVP)

## License

TBD
