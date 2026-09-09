# Kigumo Bendera Dorms — Implementation Plan

**Source of truth:** `kigumo-bendera-dorm-srs.md`
**Repo name:** `kigumo-bendera-dorms`
**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · Prisma · TiDB Serverless (MySQL) · Auth0 (`@auth0/nextjs-auth0` v3) · Vercel

---

## Overview

Rebuild the legacy MS Access dorm management system used at Kigumo Bendera Senior School as a
modern web application. The app is staff-only (no student self-service), has two roles (Admin,
Dorm Master), and must be functionally equivalent to the legacy Access switchboard at parity v1.

The build is split into 10 sequential sub-tasks. Each sub-task is self-contained: it can be
reviewed, tested, and approved before the next begins. Every sub-task ends with a note section
for the implementer to record any SRS deviations discovered.

**Design rules (non-negotiable):**
- Flat colors only — no gradients anywhere
- Three colors: Primary `#14213D` (navy), Neutral `#FDFDFC` (base/bg), Accent `#E8A33D` (amber)
- Tints/shades of those three for hover/disabled — never a new hue
- Single sans-serif font family (Inter or system-ui), 2–3 weights max
- Mobile-responsive at 375 px / 768 px / 1280 px+
- Tables degrade to stacked card layout on mobile — no horizontal-scroll-only tables
- No shadows, glassmorphism, or decorative flourishes

---

## Sub-Task 1 — Project Scaffold

**Status:** [ ] pending

### Intent
Stand up the repo skeleton: Next.js 14 App Router + TypeScript + Tailwind CSS +
Prisma + TiDB connection string placeholder. This is the foundation every other
sub-task builds on; getting the folder structure and toolchain right here prevents
churn later.

### Expected Outcomes
- `npx next dev` runs with no errors, landing on a bare `/` route
- Tailwind configuration uses only the three design-system colors (extended in
  `tailwind.config.ts`); no default color palette leakage into the UI
- Prisma schema file exists with all 10 tables from SRS §6, referential integrity
  constraints, and a composite check on `Beds.CubeID` ↔ `Beds.DormCode`
- `.env.example` lists every required env var (TiDB connection string, Auth0
  domain/client/secret, Auth0 audience); `.env.local` is git-ignored
- `README.md` covers local setup in ≤ 20 lines

### Todo List
1. `npx create-next-app@latest kigumo-bendera-dorms` with TypeScript, Tailwind, App Router, src/ dir, ESLint
2. Remove Next.js boilerplate (default styles, page content, favicon placeholder text)
3. Extend `tailwind.config.ts`:
   - Add `primary`, `neutral`, `accent` color tokens from the three hex values
   - Set `fontFamily.sans` to `['Inter', 'system-ui', 'sans-serif']`
   - Disable the default color palette or namespace it so it can't accidentally be used
4. Add Inter font via `next/font/google` in the root layout
5. `npm install prisma @prisma/client` — run `npx prisma init --datasource-provider mysql`
6. Write the full Prisma schema (`prisma/schema.prisma`) exactly matching SRS §6:
   - All 10 models: Students, Dorms, Cubes, Beds, BedsAssignment, DormSecretaries,
     DormCleaners, AcademicYear, AuditLog, Users
   - Enforce the `Beds.CubeID` ↔ `Beds.DormCode` consistency via a Prisma `@@index`
     and a raw SQL migration check constraint (comment in schema if Prisma can't
     express it natively — add the raw SQL to a migration file)
   - Add `@@unique` and `@@index` as needed for common query patterns
   - `status` on Students as an enum: `active | archived`
   - `BedStatus` on Beds as an enum: `ok | needs_repair`
   - `Role` on Users as an enum: `admin | dorm_master | unassigned`
7. Create `prisma/db.ts` singleton Prisma client (handles Vercel/serverless connection pooling)
8. Add `.env.example` with `DATABASE_URL`, `AUTH0_SECRET`, `AUTH0_BASE_URL`,
   `AUTH0_ISSUER_BASE_URL`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`
9. Write `README.md` with setup steps, env var list, and `prisma db push` command

### Relevant Context
- SRS §6 for the exact schema
- SRS §5 NFR-2: no DB credentials in the browser — all Prisma usage is server-side only
- TiDB Serverless uses MySQL wire protocol; Prisma `provider = "mysql"` works as-is
- Use `?sslaccept=strict` or the TiDB CA bundle in the connection string

### Deviations from SRS
_Record any deviations here after implementation._

---

## Sub-Task 2 — Auth0 Integration + Role-Based Route Protection

**Status:** [ ] pending

### Intent
Wire Auth0 Universal Login, extract the `app_metadata.role` custom claim,
persist it into the local `Users` table on first login, and protect every
dashboard route server-side. This is the security layer that every feature
relies on.

### Expected Outcomes
- `/api/auth/[auth0]` catch-all route handles login/logout/callback/me
- Session contains `user.role` derived from `app_metadata.role`
- Middleware (`middleware.ts`) redirects unauthenticated users to `/api/auth/login`
  for all `/dashboard/*` and `/api/*` paths
- A reusable server-side helper `requireRole(role)` throws a 403 response if the
  caller's role doesn't match — every API route uses this
- On first login, the app upserts a `Users` row with the Auth0 subject, email, and role
- `/dashboard` landing page shows the user's name and role; a "Logout" button works
- Dorm Master role is scoped to `DormScope` (optional, nullable array of dorm codes)

### Todo List
1. `npm install @auth0/nextjs-auth0`
2. Create `src/app/api/auth/[auth0]/route.ts` using the Auth0 Next.js v3 App Router handler
3. Create `src/lib/auth.ts`:
   - `getSession` wrapper
   - `requireAuth()` — redirects to login if no session
   - `requireRole(allowedRoles: Role[])` — returns 403 JSON if role not in allowed list
4. Create `middleware.ts` at the project root to protect `/dashboard` and `/api` routes
   (allow `/api/auth/*` through for login flow)
5. Create `src/app/api/auth/on-login/route.ts` (Auth0 post-login action or app-level
   callback) that upserts the `Users` row after a successful login
6. Create `/dashboard/page.tsx` — role-aware landing: renders the switchboard menu
   matching the nav tree in SRS §3, with admin-only items hidden (and 403-protected
   server-side) for Dorm Masters
7. Create `src/components/layout/DashboardLayout.tsx` — sidebar/top nav using
   the design system colors; active link uses accent color `#E8A33D`
8. Write a simple `/dashboard/unauthorized` page shown when a logged-in user has
   no role yet (per FR-2)

### Relevant Context
- SRS §2 (roles), §4.1 (FR-1 through FR-4)
- Auth0 `app_metadata.role` is set in the Auth0 dashboard (Actions or Rules)
- `@auth0/nextjs-auth0` v3 uses App Router handlers natively
- `DormScope` on `Users` is a JSON/string column; parse as `string[] | null`

### Deviations from SRS
_Record any deviations here after implementation._

---

## Sub-Task 3 — Homepage with Carousel

**Status:** [ ] pending

### Intent
Build the public-facing homepage that visitors and unauthenticated staff see first.
This is the school's public face; the carousel is the primary visual element.

### Expected Outcomes
- Public routes `/`, `/about`, `/contact` render without authentication
- Top nav has exactly: Home, About, Contact/Support, Login (routes to `/api/auth/login`)
- Hero section has an auto-advancing carousel:
  - Auto-plays, pauses on hover/touch
  - Manual prev/next arrow controls
  - Dot indicators below
  - Full-bleed on mobile, max-width contained on desktop
  - Lazy-loaded images with descriptive alt text per slide
  - Flat `#14213D` semi-transparent scrim (no gradient) under any text overlay
  - All controls/dots use only the 3-color palette
- No external carousel library required (a minimal custom React hook is fine)
- About and Contact pages are simple static content pages

### Todo List
1. Create `src/app/(public)/layout.tsx` — public layout with top nav (Home, About, Contact,
   Login button) using design system colors
2. Create `src/components/Carousel.tsx`:
   - Accepts an array of `{ src, alt, caption? }` slide objects
   - Maintains `currentIndex` state; `useEffect` timer for auto-advance (3–5 s)
   - `onMouseEnter`/`onMouseLeave` pause/resume timer
   - Prev/Next buttons: flat `#14213D` background, `#FDFDFC` icon, `#E8A33D` hover
   - Dot indicators: inactive = `#14213D` at 40% opacity, active = `#E8A33D`
   - Uses Next.js `<Image>` with `loading="lazy"` and `fill` layout
   - Scrim: `<div className="absolute inset-0 bg-primary/60">` (flat, no gradient)
3. Create `src/app/(public)/page.tsx` — imports Carousel, passes placeholder slide data
   (10 slides with descriptive alt text; actual photos added later by the school)
4. Create `src/app/(public)/about/page.tsx` — brief school and system description
5. Create `src/app/(public)/contact/page.tsx` — contact info / support email
6. Ensure mobile responsiveness at 375 px and 1280 px for all three pages

### Relevant Context
- Design system: flat scrim, not a gradient overlay on photos
- SRS §3 (public nav)
- Login button must link to `/api/auth/login` (Auth0 Universal Login redirect)

### Deviations from SRS
_Record any deviations here after implementation._

---

## Sub-Task 4 — Students Module (CRUD + Search)

**Status:** [ ] pending

### Intent
Implement the core Students data-entry screen. Students are the central entity;
every other module (beds, secretaries, cleaners) references them.

### Expected Outcomes
- `/dashboard/students` lists all active students; archived students hidden by default
  but toggleable by Admin
- Search/filter by: name, admission number, class (`C_Class`), stream, year
- "Add Student" form creates a new `Students` row
- Clicking a row opens an edit form; changes save via `PATCH /api/students/[id]`
- No "Delete" button — archiving is handled in Sub-Task 9 (Admin-only)
- Table degrades to stacked card layout at 375 px (no horizontal scroll trap)
- API routes: `GET /api/students`, `POST /api/students`, `PATCH /api/students/[id]`
  — all validate role server-side via `requireRole`

### Todo List
1. Create `src/app/api/students/route.ts` — `GET` (list + filter) and `POST` (create)
   - Validate required fields: `stAdmNo`, `stName`, `C_Class`, `Stream`, `YearId`
   - `GET` filters: `class`, `stream`, `yearId`, `status` (default `active`)
   - `POST` checks for duplicate `stAdmNo` before insert
2. Create `src/app/api/students/[id]/route.ts` — `GET` (single) and `PATCH` (update)
   - `requireRole(['admin', 'dorm_master'])` on both
3. Create `src/app/dashboard/students/page.tsx` — server component that fetches initial
   list; passes to `StudentsTable` client component
4. Create `src/components/students/StudentsTable.tsx` — client component:
   - Desktop: `<table>` with sortable columns
   - Mobile (< 768 px): stacked card per student
   - Search bar and filter dropdowns above the table
5. Create `src/components/students/StudentForm.tsx` — shared add/edit form with
   validation; uses controlled inputs; submission calls the API
6. Create `src/app/dashboard/students/new/page.tsx` — wraps `StudentForm` for creation
7. Create `src/app/dashboard/students/[id]/page.tsx` — wraps `StudentForm` for editing
8. Add `AcademicYear` seed data helper — create at least one `AcademicYear` row so the
   form's year dropdown isn't empty on first run

### Relevant Context
- SRS §4.2 (FR-5, FR-6, FR-7)
- `stAdmNo` is the natural PK (admission number); it's a string, not an auto-increment
- `status` defaults to `active`; archived students are SRS FR-20 scope (Sub-Task 9)
- `C_Class` values: `Form 1`, `Form 2`, `Form 3`, `Form 4` (or numeric — confirm with school)

### Deviations from SRS
_Record any deviations here after implementation._

---

## Sub-Task 5 — Dorms / Cubes / Beds Modules

**Status:** [ ] pending

### Intent
Implement CRUD for the three physical-infrastructure entities. Beds are the
leaf nodes that tie to students via allocation; getting the integrity constraint
right here (cube must belong to the same dorm as the bed) is critical.

### Expected Outcomes
- `/dashboard/dorms` — list/add/edit Dorms
- `/dashboard/cubes` — list/add/edit Cubes (filtered by dorm)
- `/dashboard/beds` — list/add/edit Beds (filtered by dorm and/or cube)
- Creating/editing a Bed enforces: `Beds.CubeID` must belong to `Beds.DormCode`
  (checked in the API route; the DB-level constraint from Sub-Task 1 is the
  backstop)
- All three pages mobile-responsive with card layout on small screens
- API routes protected by `requireRole`

### Todo List
1. Create API routes:
   - `GET/POST /api/dorms`, `PATCH/GET /api/dorms/[id]`
   - `GET/POST /api/cubes`, `PATCH/GET /api/cubes/[id]`
   - `GET/POST /api/beds`, `PATCH/GET /api/beds/[id]`
2. In `POST /api/beds` and `PATCH /api/beds/[id]`: validate that the provided
   `CubeID` belongs to the provided `DormCode` (query DB before insert/update;
   return 422 with a clear error message if not)
3. Create dashboard pages and form/table components for each entity following
   the same pattern established in Sub-Task 4
4. Dorms form fields: `DormCode`, `D_Name`, `Capacity`, `Patron`
5. Cubes form fields: `CubeID`, `DormCode` (dropdown), `Location`
6. Beds form fields: `BedNo`, `DormCode` (dropdown), `CubeID` (dropdown filtered by
   selected dorm), `BedStatus` (ok / needs_repair), `IsOccupied` (read-only, derived
   from active assignment)
7. `IsOccupied` on Beds is computed from `BedsAssignment` (no open `EndDate`) —
   do not allow direct editing of this flag; mark the field as read-only in the UI

### Relevant Context
- SRS §4.3 (FR-8, FR-9, FR-10, FR-11)
- FR-11: cube-dorm consistency is the key integrity fix over the legacy system
- `IsOccupied` is derived, not user-editable — make this visually clear in the form

### Deviations from SRS
_Record any deviations here after implementation._

---

## Sub-Task 6 — Bed Allocation Module

**Status:** [ ] pending

### Intent
Implement the core operational workflow: assigning a student to a bed, and
un-assigning / re-assigning. This module creates `BedsAssignment` records and
is the primary day-to-day tool for dorm masters.

### Expected Outcomes
- `/dashboard/allocation` — shows current active allocations as a table/card list
- "Assign" action: select student (autocomplete by name/adm no) and vacant bed
  (dropdown filtered by dorm); submits `POST /api/allocation`
- API rejects assigning a student to an already-occupied bed (FR-12)
- "Un-assign" sets `EndDate = today` on the current open allocation record;
  does NOT delete (FR-13)
- "Re-assign" is: un-assign current bed, then assign to a new bed in the same
  form flow
- Filter allocations by dorm, class, year

### Todo List
1. Create `POST /api/allocation` — assigns student to bed:
   - Check: student does not already have an open allocation for this year
   - Check: bed has no open allocation (IsOccupied guard)
   - Insert `BedsAssignment` with `StartDate = today`, `EndDate = null`
   - Update `Beds.IsOccupied = true`
2. Create `PATCH /api/allocation/[id]/unassign` — closes the allocation:
   - Set `EndDate = today`
   - Set `Beds.IsOccupied = false`
3. Create `GET /api/allocation` — list active allocations with join to Students, Beds, Dorms
4. Create `src/app/dashboard/allocation/page.tsx` + components:
   - Allocation table with Unassign button per row
   - "New Assignment" button opens a modal or inline form
5. The student autocomplete search should only show students with `status = active`
   and no current open allocation
6. The bed dropdown should only show beds with `IsOccupied = false` and
   `BedStatus = ok`

### Relevant Context
- SRS §4.4 (FR-12, FR-13)
- Re-assignment is a two-step operation: close current → open new; implement as a
  single form for UX but two API calls (or one transaction on the server)
- Keep both old and new allocation records — do not delete history

### Deviations from SRS
_Record any deviations here after implementation._

---

## Sub-Task 7 — Reports (View + Print + Export)

**Status:** [ ] pending

### Intent
Implement all seven reports from SRS §4.6 as filterable on-screen tables with
Print and Export-to-Excel actions.

### Expected Outcomes
- Seven report pages under `/dashboard/reports/`:
  1. `beds-per-class` — beds allocation grouped by class
  2. `beds-per-dorm` — beds allocation grouped by dorm
  3. `unoccupied-beds` — beds where `IsOccupied = false`
  4. `beds-for-repair` — beds where `BedStatus = needs_repair`
  5. `dorm-secretaries` — current `DormSecretaries` with student names
  6. `dorm-cleaners` — current `DormCleaners` with student names
  7. `class-lists` — students grouped by class and stream
- Each report has a filter bar (year, dorm, class as applicable)
- "Print" button triggers `window.print()` with a print stylesheet that hides nav
  and buttons, shows only the table
- "Export to Excel" calls a `/api/reports/[report]/export` route that streams an
  `.xlsx` file via `exceljs`
- Print stylesheet added to the root layout (hidden in screen media, visible in
  print media)

### Todo List
1. `npm install exceljs`
2. Create `src/app/api/reports/[report]/route.ts` — parametric JSON data endpoint
   for each of the 7 reports
3. Create `src/app/api/reports/[report]/export/route.ts` — streams `.xlsx` using
   `exceljs`; headers include school name, report title, date; data rows match the
   on-screen columns
4. Create `src/app/dashboard/reports/layout.tsx` — shared filter bar + Print/Export
   buttons
5. Create one page per report; each is a client component that fetches from the JSON
   endpoint and renders a table (or stacked cards on mobile)
6. Add `src/styles/print.css` (or Tailwind print: variants) — hide `nav`, `aside`,
   `.no-print` elements; ensure tables print at full width with borders

### Relevant Context
- SRS §4.6 (FR-16, FR-17)
- Excel export format should match the legacy `.xls` sample files (school name in
  header row, column names, data rows, no extra formatting)
- `exceljs` runs on the Node.js side (API route) — never import it in a client component

### Deviations from SRS
_Record any deviations here after implementation._

---

## Sub-Task 8 — Dorm Secretaries & Dorm Cleaners Modules

**Status:** [ ] pending

### Intent
Implement the two role-assignment modules. These fix the legacy design flaw where
secretaries/cleaners were stored as duplicate person records rather than FK references
to existing students.

### Expected Outcomes
- `/dashboard/secretaries` and `/dashboard/cleaners` — list current assignees
- "Assign" form: select an existing student (autocomplete), select dorm, select year;
  enforces one active secretary and one active cleaner per student per year (FR-15)
- "Remove" sets an `EndDate` equivalent (or a soft-delete flag) — does not delete the row
- API routes protected by `requireRole`

### Todo List
1. Create `GET/POST /api/secretaries`, `PATCH /api/secretaries/[id]`
2. Create `GET/POST /api/cleaners`, `PATCH /api/cleaners/[id]`
3. In `POST /api/secretaries`: enforce uniqueness — one active secretary per dorm per year
4. In `POST /api/cleaners`: enforce uniqueness — one active cleaner per dorm per year
5. Create dashboard pages and components following the established pattern
6. Student autocomplete shows only active students not already holding the same role
   in the same year

### Relevant Context
- SRS §4.5 (FR-14, FR-15)
- FK into `Students.stAdmNo` — never duplicate the person record
- `DormSecretaries.Role` field distinguishes secretary type if needed

### Deviations from SRS
_Record any deviations here after implementation._

---

## Sub-Task 9 — Promote / Demote / Archive (Admin-Only)

**Status:** [ ] pending

### Intent
Implement the three bulk admin operations from SRS §4.7. These are destructive/
irreversible-ish operations and must have confirmation previews and full audit logging.

### Expected Outcomes
- `/dashboard/admin/promote` — bulk promote: select cohort (year + class), preview
  count of affected students, confirm → advances `C_Class` for all selected students
- `/dashboard/admin/demote` — same pattern, reverse direction
- `/dashboard/admin/archive` — select individual students or filter cohort, preview list,
  confirm → sets `status = archived`, `archived_at = now()`
- All three: write an `AuditLog` row (userId, action, targetTable, rowCount, timestamp)
- All three routes (`/api/admin/*`) return 403 for non-admin roles — `requireRole(['admin'])`
- No cascading delete — archived students' allocation history is preserved

### Todo List
1. Create `POST /api/admin/promote` — updates `C_Class` for a filtered cohort in a
   single transaction; writes `AuditLog`
2. Create `POST /api/admin/demote` — same, reverse; rejects if already at Form 1
3. Create `POST /api/admin/archive` — sets `status = archived`, `archived_at`; writes
   `AuditLog`; does NOT delete `BedsAssignment` rows (closes any open allocation)
4. Create `GET /api/admin/preview` — returns the list/count of students that would be
   affected by a given promote/demote/archive operation (used for the confirmation step)
5. Create admin dashboard pages with:
   - Step 1: filter form (year, class, stream, or individual selection for archive)
   - Step 2: confirmation modal showing the list/count of affected students
   - Step 3: submit button that calls the action endpoint
6. Add `AuditLog` viewer at `/dashboard/admin/audit` — table of recent audit entries
   (admin-only)
7. Ensure the `Users` management page at `/dashboard/admin/users`:
   - Lists all users with their current role
   - Admin can change a user's role (calls `PATCH /api/admin/users/[id]`)
   - Admin can set/change `DormScope` for Dorm Master accounts

### Relevant Context
- SRS §4.7 (FR-18, FR-19, FR-20, FR-21)
- Promote advances `C_Class`: Form 1 → Form 2 → Form 3 → Form 4 → (graduated, archive)
- Demote reverses: Form 2 → Form 1 (reject if Form 1)
- Archive is soft-delete only — never hard delete
- AuditLog write must be in the same DB transaction as the student update

### Deviations from SRS
_Record any deviations here after implementation._

---

## Sub-Task 10 — Polish Pass

**Status:** [ ] pending

### Intent
Audit the entire application for mobile responsiveness, accessibility,
empty/loading/error states, and design-system consistency. This is the final
quality gate before the v1 release.

### Expected Outcomes
- Every route tested at 375 px, 768 px, 1280 px — no layout breaks
- All tables in stacked card layout on mobile (no horizontal-scroll-only pattern)
- Every async operation has a loading skeleton or spinner (uses design-system colors)
- Every empty data state has a descriptive empty-state message (not a blank page)
- Every error state has a user-friendly message and a retry action
- All interactive elements have `:focus-visible` outlines (accessible keyboard navigation)
- Color contrast meets WCAG AA for all text/background combinations
- `<Image>` alt text is set on all images
- `<title>` tags and `<meta description>` set per page
- No gradient backgrounds, no shadows, no glassmorphism anywhere
- `npm run build` passes with no TypeScript errors or ESLint warnings

### Todo List
1. Audit every page at 375 px — fix any overflow or layout issues
2. Confirm all tables use the mobile card pattern from Sub-Task 4 as the template
3. Add loading states: use React `Suspense` boundaries + skeleton components
   (flat `#14213D` at 10% opacity pulse animation)
4. Add empty states: each table/list component renders an empty-state card when data
   is an empty array
5. Add error boundaries or `error.tsx` files per Next.js App Router convention
6. Audit color contrast: navy `#14213D` on neutral `#FDFDFC` background and vice versa —
   both pass WCAG AA
7. Add `<title>` and `<meta name="description">` to root `layout.tsx` and per-page
   metadata exports
8. Run `npm run build` — resolve all TypeScript and ESLint errors
9. Verify flat colors only — grep codebase for `gradient`, `shadow`, `blur`, `backdrop`
   and remove any that aren't explicitly justified

### Relevant Context
- Design system rules (stated in the Overview above)
- Next.js App Router `error.tsx`, `loading.tsx`, `not-found.tsx` conventions

### Deviations from SRS
_Record any deviations here after implementation._

---

## Resolved Decisions (formerly Open Questions from SRS §8)

1. **Archived student editing** — Admins can fully edit any field on an archived
   student without first unarchiving them. The edit form renders in full for Admins
   even when `status = archived`.

2. **C_Class values** — Two curriculum tracks:
   - **8-4-4 track:** `F3`, `F4` (only senior forms board)
   - **CBC track:** `G10`, `G11`, `G12`
   - **Streams per class** (examples): `G10` has streams `10M`, `10B`, `10N`, `10S`, `10L`;
     `F3`/`F4` have streams `S`, `N`, `L`, `B`, `V`
   - Store `C_Class` and `Stream` as separate string fields.
   - Promote/demote logic: `G10 → G11 → G12` and `F3 → F4`; demote reverses.
     Promoting `G12` or `F4` should warn the Admin (graduation) and offer to archive.

3. **DormScope** — stored as a JSON array of dorm codes (e.g. `["DORM_A","DORM_B"]`).
   A Dorm Master can be scoped to one or many dorms simultaneously.

4. **Carousel images** — 6 royalty-free Unsplash placeholder images (school/education
   themed); school will swap in real photos later. Add Unsplash to `images.remotePatterns`
   in `next.config.ts`.

5. **`DormSecretaries.Role` values** — exactly two: `"secretary"` and
   `"assistant_secretary"`. Store as a Prisma enum `SecretaryRole`.
