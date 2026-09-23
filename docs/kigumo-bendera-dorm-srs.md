# Software Requirements Specification
## Kigumo Bendera Senior School — Dorm Management System (Web Edition)

**Version:** 0.1 (Draft)
**Author:** Francis Mwangi Kienji (FK Systems Africa)
**Source system:** Legacy MS Access "Kigumo Bendera High School Dorms System"
**Target stack:** React (Next.js) · MySQL on TiDB Serverless · Vercel · Auth0

---

## 1. Purpose and scope

Replace the legacy MS Access dorm management system — currently used to record students, dorms, cubes, beds, bed allocation, dorm secretaries, and dorm cleaners — with a web application that is functionally equivalent (1:1 parity with the Access menu) but runs in a browser, enforces data integrity at the schema level, and removes the destructive, unaudited bulk operations found in the original.

This is a non-commercial build (free-tier infrastructure throughout), intended both as a working tool for the school and as a portfolio/learning project.

**In scope:** everything currently reachable from the Access switchboard (Data Entry/Search, View Reports, Print Reports, Promote/Demote/Remove Students, Class List export).
**Out of scope for v1:** payments, SMS/email notifications, mobile app, multi-school support, self-service student login.

---

## 2. Actors and roles

Only school staff log in — no student, secretary, or cleaner self-service accounts. Two roles, both authenticated via Auth0:

| Role | Description | Permissions |
|---|---|---|
| **Admin (Deputy Principal / ICT)** | Full system owner | All CRUD, promote/demote/remove, archive/restore, manage other users' roles |
| **Dorm Master / Assistant Dorm Master** | Day-to-day dorm operations | CRUD on students, beds, allocation, secretaries, cleaners within their assigned dorm(s); can view/print reports; **cannot** promote/demote/remove or manage users |

Auth0 handles authentication; role is carried as a custom claim (`app_metadata.role`) in the ID token and checked both in the UI (hide/disable controls) and in every API route (server-side authorization — never trust the frontend check alone).

---

## 3. Information architecture / navigation

```
Public
└─ Home page (few tabs: About, Contact/Support, Login)

Authenticated (post-Auth0 login)
└─ Dashboard (role-aware landing menu — modernized switchboard)
   ├─ Data Entry / Search
   │  ├─ Students
   │  ├─ Beds
   │  ├─ Dormitories
   │  ├─ Cubes
   │  ├─ Dorm Secretaries
   │  ├─ Dorm Cleaners
   │  └─ Bed Allocation
   ├─ Reports (View)
   │  ├─ Beds Allocation Per Class
   │  ├─ Beds Allocation Per Dorm
   │  ├─ Unoccupied Beds
   │  ├─ Beds For Repair
   │  ├─ Dorm Secretaries
   │  ├─ Dorm Cleaners
   │  └─ Class Lists
   ├─ Export
   │  ├─ Class List → Excel
   │  └─ Reports → PDF/Print view
   └─ Admin-only
      ├─ Promote Students
      ├─ Demote Students
      ├─ Archive Students ("Remove", soft-delete)
      └─ User & Role Management
```

The "View Reports" and "Print Reports" columns from Access collapse into one **Reports** section with an on-screen table view and a **Print** button (browser print / PDF export) per report — same underlying query, one fewer redundant screen.

---

## 4. Functional requirements

### 4.1 Authentication & authorization
- FR-1: Users log in via Auth0 (email/password or school Google Workspace, if available).
- FR-2: On first login, a new user has no role and cannot access the dashboard until an Admin assigns one.
- FR-3: Every API route re-validates the caller's role server-side; a Dorm Master calling an admin-only endpoint gets `403`, not just a hidden button.
- FR-4: Dorm Master accounts can optionally be scoped to specific `DormCode`(s) — they only see/edit students and beds in their assigned dorm(s).

### 4.2 Students
- FR-5: Create/edit/search students by admission number, name, class, stream, year.
- FR-6: A student's assigned bed is derived from `BedsAssignment` (see §6) — never stored redundantly on the student record.
- FR-7: Search/filter by class, stream, dorm, or bed status.

### 4.3 Dorms, Cubes, Beds
- FR-8: CRUD on `Dorms` (code, name, capacity, patron).
- FR-9: CRUD on `Cubes` (id, location, parent dorm).
- FR-10: CRUD on `Beds` (bed no., dorm, cube, occupied flag, status: OK / needs repair).
- FR-11: A bed's cube must belong to the same dorm as the bed itself — enforced at the database level (composite FK / check), fixing the original schema's silent orphan-cube bug.

### 4.4 Bed allocation
- FR-12: Assign a student to a vacant bed; the system rejects assigning a second active student to an already-occupied bed.
- FR-13: Un-assign / re-assign a student (creates a new allocation record; old one is closed with an end date, not deleted — gives you allocation history for free, which the Access version never had).

### 4.5 Dorm Secretaries & Dorm Cleaners
- FR-14: Assign the **secretary** and **cleaner** roles to an existing student (foreign key into `Students`, not a duplicate person record — fixes the original design flaw).
- FR-15: One student can hold at most one active secretary role and one active cleaner role per year.

### 4.6 Reports
- FR-16: Beds Allocation Per Class / Per Dorm, Unoccupied Beds, Beds For Repair, Dorm Secretaries list, Dorm Cleaners list, Class Lists — each as a filterable on-screen table.
- FR-17: Every report has a "Print" action (browser print stylesheet) and an "Export to Excel" action (matches the sample `.xls` files you already have).

### 4.7 Promote / Demote / Archive students
- FR-18: **Promote** — bulk-advance `C-Class` for a selected cohort at year-end. Requires an explicit confirmation step showing a preview/count of affected students before committing.
- FR-19: **Demote** — same pattern, reverse direction.
- FR-20: **Archive ("Remove")** — replaces hard delete. Sets `status = archived` and `archived_at` timestamp; archived students disappear from active lists/reports but remain queryable by Admins. No cascading delete of their historical bed-allocation records.
- FR-21: All three actions write an entry to an `AuditLog` table (who, what, when, how many rows affected) — something the Access system had no equivalent of at all.

---

## 5. Non-functional requirements

- NFR-1: **Cost** — must run entirely on free tiers: TiDB Serverless (free tier, MySQL-wire-compatible), Vercel (Hobby plan), Auth0 (free tier, up to 7,000 active users — far more than one school needs).
- NFR-2: **Security** — no direct database credentials in the browser; all DB access goes through server-side API routes. Auth0 manages password storage/session tokens, not the app itself.
- NFR-3: **Data integrity** — foreign keys and unique constraints enforced in MySQL, not just in application code (this is the main upgrade over Access, which only enforced relationships loosely).
- NFR-4: **Usability** — the dashboard must be operable by non-technical dorm staff; keep the modernized menu conceptually identical to the familiar Access switchboard so retraining is minimal.
- NFR-5: **Auditability** — every destructive/bulk action is logged (see FR-21).

---

## 6. Data model (normalized)

Fixes applied vs. the original Access schema:
- Removed the redundant `BedAssigned` field from `Students` — allocation lives only in `BedsAssignment`.
- `DormSecretaries` and `DormCleaners` reference `Students.stAdmNo` as a true foreign key instead of duplicating a "person" concept.
- Added a shared `AcademicYear` table so promote/demote touches one place instead of five duplicated `Year` columns.
- Added `status`/`archived_at` to `Students` and `Beds` for soft-delete and repair tracking.
- Added `AuditLog` for FR-21.

```
Students(stAdmNo PK, stName, C_Class, Stream, YearId FK, status, archived_at)
Dorms(DormCode PK, D_Name, Capacity, Patron)
Cubes(CubeID PK, DormCode FK, Location)
Beds(BedNo PK, DormCode FK, CubeID FK, BedStatus, IsOccupied)
BedsAssignment(AssignId PK, StAdmNo FK, BedNo FK, YearId FK, StartDate, EndDate NULL)
DormSecretaries(Id PK, StAdmNo FK, DormCode FK, YearId FK, Role)
DormCleaners(Id PK, StAdmNo FK, DormCode FK, YearId FK, AreaAssigned)
AcademicYear(YearId PK, Label, IsCurrent)
AuditLog(Id PK, UserId, Action, TargetTable, RowCount, Timestamp)
Users(Id PK, Auth0Sub, Email, Role, DormScope NULL)
```

---

## 7. Technical architecture

- **Framework**: Next.js (React) — gives you the frontend and, via API routes, a backend on the same free Vercel deployment, so you don't need a separate server for the MySQL/TiDB connection.
- **Database**: TiDB Serverless, connected from API routes using `mysql2` or an ORM (Prisma is a strong fit — it maps cleanly to the schema above and generates migrations).
- **Auth**: Auth0 Next.js SDK (`@auth0/nextjs-auth0`) handling login/logout/session; role claim read in `getServerSideProps`/route handlers to gate access.
- **Hosting**: Vercel, connected to your GitHub repo for CI/CD on every push.
- **Exports**: `exceljs` for Excel exports, browser `window.print()` + print stylesheet (or a lightweight PDF lib) for the "Print Reports" screens.

---

## 8. Assumptions & open questions

- Assumes the school has reasonably reliable internet at the point of data entry (no offline mode planned for v1).
- Assumes one school / one deployment (no multi-tenant design needed).
- TiDB Serverless free tier has usage caps (storage + request units) — fine for one school's data volume, but worth monitoring as the system grows.
- Open: should Admins be able to fully edit an archived student's record, or only view it read-only?
