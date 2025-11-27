# Zero-Friction Budget - Development Plan

## Overview
A minimalist cross-platform budgeting app with offline-first architecture. Single codebase for iOS, Android, and Web.

## Tech Stack
- **Framework**: Flutter 3.x
- **Language**: Dart
- **Backend**: Firebase (Firestore + Authentication)
- **Local Database**: Hive (offline-first storage)
- **State Management**: Riverpod
- **Auth**: Google OAuth only
- **UI Style**: Adaptive (Cupertino on iOS, Material on Android)

## Core Features (MVP)

### 1. Authentication
- Google OAuth sign-in only
- Automatic household creation for new users

### 2. Expense Entry (Home Screen)
- Minimalist single-input design
- Enter amount → Select category → Optional description → Confirm
- Instant save with confirmation toast
- Works fully offline

### 3. Dashboard
- Total remaining budget for current month
- List of budget categories with progress bars
- Color coding: Green (<70%), Yellow (70-90%), Red (≥90%)
- Side drawer navigation

### 4. Budget Management
- User-defined categories with monthly limits
- Default categories on first launch
- Add/Edit/Delete categories (Admin only)
- Reorder categories

### 5. Household Management
- Personal (single-user) or shared household budgeting
- Admin can invite users via email
- Role-based permissions:
  - **Admin**: Full access (edit budget, manage users, all expense operations)
  - **Standard**: View dashboard + add expenses only

### 6. Expense Management
- Edit/delete expenses (creator or Admin)
- Filter by current month
- Soft delete for sync integrity

### 7. Budget Reset Logic
- All spending totals reset to $0 on the 1st of every month
- Reset occurs at midnight in user's device timezone

## Architecture

### Offline-First Design
```
User Action → Local Hive DB (instant) → Sync to Firebase (when online)
Firebase Change → Real-time listener → Update Hive → Update UI
```

**Benefits:**
- App works 100% offline
- Instant UI updates (no loading states)
- Automatic sync when connection restored
- Conflict resolution: last-write-wins

### Data Models

```dart
// All models have `isSynced` flag for sync tracking

UserModel {
  id, email, displayName, photoUrl, householdId, createdAt
}

HouseholdModel {
  id, name, adminUserId, members: Map<userId, role>, timezone, createdAt
}

BudgetCategoryModel {
  id, householdId, name, monthlyLimit, icon, colorHex, order
}

ExpenseModel {
  id, householdId, categoryId, amount, description,
  createdByUserId, createdAt, monthKey, isDeleted
}
```

### Project Structure
```
lib/
├── main.dart
├── app.dart
├── core/
│   ├── constants/
│   ├── theme/
│   └── utils/
├── data/
│   ├── models/
│   ├── repositories/
│   └── services/ (hive, firebase, sync)
├── providers/ (Riverpod)
└── presentation/
    ├── auth/
    ├── home/
    ├── dashboard/
    ├── budget/
    └── household/
```

## Development Phases

### Phase 0: Setup (Week 1) ✅
- [x] Install Flutter SDK
- [x] Initialize project
- [x] Create GitHub repo
- [x] Create issues
- [x] Create plan.md

### Phase 1: Firebase & Authentication (Weeks 2-3)
**Goal:** User can sign in with Google

**Tasks:**
- Set up Firebase project
- Configure Firebase for Flutter (Android/iOS/Web)
- Add Firebase Auth + Google Sign-In packages
- Implement Google OAuth login flow
- Create user model and Hive setup
- Build login screen with adaptive UI
- Auto-create household on first sign-in

**Deliverable:** Working Google sign-in → Home screen

### Phase 2: Local Data Layer (Weeks 3-4)
**Goal:** Offline data storage working

**Tasks:**
- Set up Hive database with all type adapters
- Create all data models (User, Household, BudgetCategory, Expense)
- Build repository pattern (base + concrete repos)
- Set up Riverpod providers
- Implement CRUD operations for local storage
- Test data persistence across app restarts

**Deliverable:** Data persists locally, survives app restart

### Phase 3: Home Screen - Expense Entry (Week 5)
**Goal:** Users can add expenses offline

**Tasks:**
- Build minimalist home screen UI
- Create amount input with currency formatting
- Build category selection bottom sheet
- Add optional description input
- Implement local expense save
- Create confirmation toast/snackbar
- Add form validation

**Deliverable:** Full expense entry flow working offline

### Phase 4: Dashboard & Budget Display (Week 6)
**Goal:** View spending and budget progress

**Tasks:**
- Create dashboard with drawer navigation
- Build "Total Remaining" calculation
- Display category list with progress bars
- Add color coding logic
- Implement monthly filtering (current month only)
- Show expense count per category

**Deliverable:** Dashboard shows current month's budget status

### Phase 5: Budget Management (Week 7)
**Goal:** Create and edit budget categories

**Tasks:**
- Build budget edit screen
- Add default category presets on first launch
- Implement add/edit/delete category
- Support reordering categories (drag-to-reorder)
- Admin-only permission enforcement
- Test CRUD operations

**Deliverable:** Full budget category management

### Phase 6: Firebase Sync (Weeks 8-9)
**Goal:** Multi-device synchronization working

**Tasks:**
- Implement Firebase write operations
- Create bidirectional sync service
- Add Firestore real-time listeners
- Handle sync conflicts (last-write-wins)
- Deploy Firebase Security Rules
- Test multi-device sync
- Test offline → online transitions

**Deliverable:** Data syncs across devices in real-time

### Phase 7: Household Features (Week 10)
**Goal:** Multi-user households with permissions

**Tasks:**
- Create household settings screen
- Build member invitation system (email/link)
- Implement role assignment (Admin/Standard)
- Add permission-based UI hiding
- Test admin vs standard user flows
- Implement leave household

**Deliverable:** Shared household budgeting works

### Phase 8: Expense Management (Week 11)
**Goal:** Edit and delete expenses

**Tasks:**
- Create expense list view
- Add expense detail/edit dialog
- Implement edit functionality
- Add delete with confirmation
- Sync deletions (soft delete)
- Test permissions (creator or Admin)

**Deliverable:** Full expense CRUD

### Phase 9: Polish & Testing (Week 12)
**Goal:** Production-ready MVP

**Tasks:**
- Add loading states and error handling
- Implement user-friendly error messages
- Add haptic feedback
- Create app icons (Android/iOS/Web)
- Write integration tests
- Test extensively (offline, sync, multi-user)
- Fix all bugs

**Deliverable:** Polished, tested MVP

### Phase 10: iOS Build Setup (Week 13)
**Goal:** First iOS build via CI/CD

**Tasks:**
- Set up GitHub Actions workflow
- Configure iOS code signing
- Create first iOS build
- Test on physical device (if available)
- Document build process

**Deliverable:** Automated iOS builds

## Firebase Security Rules

```javascript
// Enforce household data isolation and role-based access

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAuthenticated() {
      return request.auth != null;
    }

    function getUserHouseholdId() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.householdId;
    }

    function isHouseholdMember(householdId) {
      return isAuthenticated() && getUserHouseholdId() == householdId;
    }

    function isHouseholdAdmin(householdId) {
      let household = get(/databases/$(database)/documents/households/$(householdId));
      return household.data.members[request.auth.uid] == 'admin';
    }

    // Users: read/write own data only
    match /users/{userId} {
      allow read, write: if isAuthenticated() && request.auth.uid == userId;
    }

    // Households: members read, admin write
    match /households/{householdId} {
      allow read: if isHouseholdMember(householdId);
      allow create: if isAuthenticated();
      allow update, delete: if isHouseholdAdmin(householdId);
    }

    // Budget categories: members read, admin write
    match /budgetCategories/{categoryId} {
      allow read: if isHouseholdMember(resource.data.householdId);
      allow write: if isAuthenticated() &&
                      isHouseholdMember(request.resource.data.householdId) &&
                      isHouseholdAdmin(request.resource.data.householdId);
    }

    // Expenses: members read, creator/admin write
    match /expenses/{expenseId} {
      allow read: if isHouseholdMember(resource.data.householdId);
      allow create: if isAuthenticated() &&
                       isHouseholdMember(request.resource.data.householdId);
      allow update, delete: if isAuthenticated() &&
                               (resource.data.createdByUserId == request.auth.uid ||
                                isHouseholdAdmin(resource.data.householdId));
    }
  }
}
```

## Key Design Patterns

### 1. Repository Pattern
Abstraction layer between UI and data sources:
```dart
abstract class Repository<T> {
  Future<List<T>> getAll();
  Future<T?> getById(String id);
  Future<void> create(T item);
  Future<void> update(T item);
  Future<void> delete(String id);
}
```

### 2. MVVM with Riverpod
- **Models**: Data classes (in `data/models/`)
- **ViewModels**: Riverpod providers (in `providers/`)
- **Views**: Widgets (in `presentation/`)

### 3. Service Layer
- **HiveService**: Local database operations
- **FirebaseService**: Cloud database operations
- **SyncService**: Orchestrates local ↔ cloud sync

## Development Environment

### Required Tools
- Flutter SDK 3.x
- Dart 3.x
- Git
- VS Code or Android Studio
- GitHub account
- Firebase account (free tier)
- Google Cloud Console access (for OAuth)

### Recommended VS Code Extensions
- Flutter
- Dart
- Error Lens
- GitLens
- Riverpod Snippets

## Timeline
**Total: ~12 weeks** for solo beginner developer

## Future Features (Post-MVP v2.0)
- Monthly history and spending trends
- Expense search and filtering
- Data export (CSV/PDF)
- Recurring expenses
- Budget templates
- Push notifications for budget alerts
- Bill splitting
- Multiple currencies

## Notes
- **Android SDK**: Install later when ready to test on Android
- **iOS Builds**: Requires Mac for final testing, but GitHub Actions can build remotely
- **Web Deployment**: Can deploy to Firebase Hosting (free tier)
- **No Mac Needed**: Develop 100% on Ubuntu, use CI/CD for iOS builds
