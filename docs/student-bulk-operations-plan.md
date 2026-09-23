# Student Bulk Operations Plan

## Top-Level Overview

**Goal:** Enhance the Students section of the KBSS Dorm System with three major capabilities:

1. **Mass student upload** — Upload an Excel (.xlsx) or CSV (.csv) file of 260+ students at once. The upload modal selects the class first, parses the file client-side, skips duplicate admission numbers, and POSTs all new records to a bulk API endpoint in one request. CBC classes (G10/G11/G12) require an Assessment Number column; 8-4-4 classes (F3/F4) only require ADMNO, NAME, STREAM (INDEX NUMBER optional). The Student model gains a new `assessmentNo` nullable column.

2. **Enhanced student list filtering** — The existing student list gains additional filter controls (stream, class, year) to be more discoverable and usable at scale.

3. **Bulk student deletion** — A "Delete Students" mode on the student list activates checkboxes. Selected students are permanently deleted from the database along with all their related records (BedsAssignment, DormSecretary, DormCleaner) via a new bulk-delete API endpoint. An animated progress display shows deletion in progress, then the list refreshes.

**Scope:**
- Add `assessmentNo` nullable column to the `Student` Prisma model and run migration
- New API endpoint: `POST /api/students/bulk` (bulk create with duplicate skip)
- New API endpoint: `DELETE /api/students/bulk-delete` (bulk permanent delete with cascade)
- New client component: `BulkUploadModal.tsx` with stepper animation, file parse, preview and result
- Template download files for both class types (F3/F4 and G10–G12)
- Update `StudentsTable.tsx` to add filter controls and delete-mode with checkboxes
- Update the student list page and single-student API/form to include `assessmentNo`

**Non-goals:**
- Streaming SSE upload progress (single POST, server-side processing)
- Changing existing single-student add form behavior (additive only)
- Modifying AuditLog deletion (immutable by design)

---

## Sub-Tasks

---

### Sub-Task 1 — Database Schema: Add `assessmentNo` to Student

**Status:** `[ ] pending`

**Intent:**
CBC (Grade 10/11/12) students have an Assessment Number (e.g. `A000719431`) that must be stored permanently on their record. The column is nullable because 8-4-4 students (F3/F4) do not have one.

**Expected Outcomes:**
- `assessmentNo` column added to the `Students` table in TiDB as `VARCHAR(20) NULL`
- Prisma schema updated; `prisma db push` applied successfully
- Existing student records are unaffected (column defaults to `null`)

**Todo List:**
1. Add `assessmentNo String? @db.VarChar(20)` field to the `Student` model in [`prisma/schema.prisma`](prisma/schema.prisma)
2. Add a database index `@@index([assessmentNo])` for lookup efficiency
3. Run `npx prisma db push` to apply the migration to TiDB
4. Run `npx prisma generate` to regenerate the Prisma client

**Relevant Context:**
- [`prisma/schema.prisma`](prisma/schema.prisma) — `Student` model at line 65
- Field is nullable (`String?`) — 8-4-4 students will have `null`
- The field should be placed after `stream` and before `yearId` for logical ordering

---

### Sub-Task 2 — Template Files for Bulk Upload

**Status:** `[ ] pending`

**Intent:**
Provide downloadable template files so users know exactly what columns are expected. There are two templates: one for 8-4-4 (F3/F4) and one for CBC (G10/G11/G12).

**Expected Outcomes:**
- Two `.xlsx` template files exist in `public/templates/`
- `students-template-844.xlsx` has columns: `ADMNO | NAME | STREAM | INDEX NUMBER`
- `students-template-cbc.xlsx` has columns: `ADMNO | NAME | STREAM | ASSESSMENT NO`
- Each file has 2–3 example rows to illustrate expected data format

**Todo List:**
1. Create a script (or use exceljs directly) to generate the two template `.xlsx` files
2. Place them at `public/templates/students-template-844.xlsx` and `public/templates/students-template-cbc.xlsx`
3. Verify the files download correctly from `/templates/students-template-844.xlsx`

**Relevant Context:**
- `exceljs` is already installed (used in [`src/app/api/reports/[report]/export/route.ts`](src/app/api/reports/%5Breport%5D/export/route.ts))
- Templates live in `public/` so Next.js serves them as static assets (no API route needed)
- Column header names must match exactly what the upload parser expects (case-insensitive matching in parser)

---

### Sub-Task 3 — Bulk Upload API Endpoint

**Status:** `[ ] pending`

**Intent:**
Create `POST /api/students/bulk` that accepts a JSON array of student rows (already parsed client-side), validates each row, skips duplicates by `stAdmNo`, and inserts all new students in a single `createMany` database call. Returns a result summary.

**Expected Outcomes:**
- `POST /api/students/bulk` accepts `{ rows: StudentRow[], classCode: string, yearId: number }`
- Each `StudentRow` has `{ stAdmNo, stName, stream, indexNo?, assessmentNo? }`
- Server validates: all required fields present, `classCode` is valid, `yearId` exists
- For CBC classes (G10/G11/G12): `assessmentNo` must be present on every row or that row is skipped with an error
- Duplicates identified by looking up all provided `stAdmNo` values against existing DB records (one bulk query, not per-row)
- New rows inserted via `prisma.student.createMany({ data: [...], skipDuplicates: true })`
- Returns `{ inserted: number, skipped: number, errors: RowError[] }` with HTTP 200
- Role guard: `admin` or `dorm_master` only

**Todo List:**
1. Create [`src/app/api/students/bulk/route.ts`](src/app/api/students/bulk/route.ts)
2. Add role check using `requireRole(["admin", "dorm_master"])`
3. Parse and validate the request body
4. Query existing `stAdmNo` values for duplicate detection (one `findMany` with `select: { stAdmNo: true }`)
5. Separate rows into `toInsert` (new) and `skipped` (duplicates)
6. Build the insert payload — map `classCode` to `cClass`, attach `yearId`, set `status: active`
7. Run `prisma.student.createMany({ data: toInsert, skipDuplicates: true })`
8. Write one `AuditLog` entry for the bulk operation
9. Return the result summary JSON

**Relevant Context:**
- Pattern for bulk operations: [`src/app/api/admin/promote/route.ts`](src/app/api/admin/promote/route.ts) — uses `prisma.$transaction`, `AuditLog`
- Existing POST single-student: [`src/app/api/students/route.ts`](src/app/api/students/route.ts)
- `prisma.student.createMany` with `skipDuplicates: true` is supported by MySQL/TiDB
- The `assessmentNo` field is only stored for CBC classes; leave `null` for F3/F4 rows

---

### Sub-Task 4 — Bulk Delete API Endpoint

**Status:** `[ ] pending`

**Intent:**
Create `DELETE /api/students/bulk-delete` that permanently removes selected students and all their related records from the database. Cascade order must respect foreign key constraints.

**Expected Outcomes:**
- `DELETE /api/students/bulk-delete` accepts `{ stAdmNos: string[] }`
- Deletes in correct FK order within a `prisma.$transaction`:
  1. Delete all `BedsAssignment` records where `stAdmNo` is in the list
  2. Free occupied beds: update `Bed.isOccupied = false` for beds that were occupied by deleted students
  3. Delete all `DormSecretary` records for those students
  4. Delete all `DormCleaner` records for those students
  5. Delete the `Student` records themselves
- Write one `AuditLog` entry for the bulk deletion
- Returns `{ deleted: number }` with HTTP 200
- Role guard: `admin` only (deletion is destructive; dorm_master cannot delete)

**Todo List:**
1. Create [`src/app/api/students/bulk-delete/route.ts`](src/app/api/students/bulk-delete/route.ts)
2. Add role check: `admin` only
3. Validate body: `stAdmNos` must be a non-empty string array (max 500 for safety)
4. Inside `prisma.$transaction`:
   a. Find beds currently assigned to these students (for the isOccupied reset)
   b. Delete `BedsAssignment` rows
   c. Update `Bed.isOccupied = false` for freed beds
   d. Delete `DormSecretary` rows
   e. Delete `DormCleaner` rows
   f. Delete `Student` rows
5. Write `AuditLog` entry (action: `"bulk_delete"`, targetTable: `"Students"`, rowCount: deleted count)
6. Return `{ deleted: stAdmNos.length }`

**Relevant Context:**
- Transaction pattern: [`src/app/api/admin/promote/route.ts`](src/app/api/admin/promote/route.ts)
- FK relationships in [`prisma/schema.prisma`](prisma/schema.prisma): `BedsAssignment`, `DormSecretary`, `DormCleaner` all reference `Student.stAdmNo`
- `Bed.isOccupied` must be reset to `false` for any bed whose occupant is deleted — otherwise beds remain permanently marked occupied
- AuditLog is never deleted (per user requirement)

---

### Sub-Task 5 — Bulk Upload Modal Component

**Status:** `[ ] pending`

**Intent:**
Build `BulkUploadModal.tsx` — the interactive modal that guides the user through selecting a class, downloading the correct template, selecting a file, parsing it client-side, showing a preview, uploading, and displaying results with animations.

**Expected Outcomes:**
- Modal opens when "Upload Students" button is clicked on the student list page
- **Step 1 (Class & Template):** User selects class (F3, F4, G10, G11, G12) from a dropdown, sees required columns explained, can download the correct template file
- **Step 2 (File Selection & Parse):** File input accepts `.xlsx` and `.csv`. On file selection, client-side parsing runs immediately using `papaparse` for CSV and `exceljs` for XLSX. Columns are matched case-insensitively. A preview table shows the first 5 rows and total row count.
- **Step 3 (Validation Summary):** Errors/warnings shown (missing required columns, rows with missing mandatory fields, etc.) before the user can proceed
- **Step 4 (Uploading):** Animated stepper shows phases: "Parsing file" → "Validating rows" → "Saving to database" → "Done". A live counter shows "Saving X of Y students..." (simulated on single POST completion)
- **Step 5 (Result):** Summary card: X inserted, Y skipped (duplicates), Z errors. A "Close & Refresh" button reloads the student list.
- Uses the project's Tailwind design system (primary `#14213D`, accent `#E8A33D`, neutral `#FDFDFC`)
- All phases accessible via keyboard; modal traps focus

**Todo List:**
1. Install `papaparse` and `@types/papaparse` npm packages
2. Create [`src/components/students/BulkUploadModal.tsx`](src/components/students/BulkUploadModal.tsx)
3. Implement 5-step wizard state machine with `useState` phase tracking
4. Build Step 1 UI: class selector dropdown + template download link
5. Build Step 2 UI: file drag-and-drop / click input, parse on file selection
   - CSV: use `papaparse.parse()` with `header: true`
   - XLSX: use `exceljs` `Workbook.xlsx.load()` in browser (it supports browser ArrayBuffer)
   - Normalize column headers to uppercase trimmed for matching
6. Build Step 3 UI: preview table (5 rows) + validation errors list
7. Build Step 4 UI: animated stepper (CSS transitions) + simulated counter during POST
8. Build Step 5 UI: result summary with insert/skip/error counts
9. Wire the POST to `/api/students/bulk` with current `yearId` from the page context
10. Add the modal to the student list page with an "Upload Students" button

**Relevant Context:**
- [`src/components/students/StudentsTable.tsx`](src/components/students/StudentsTable.tsx) — where the "Upload" button will be placed
- [`src/app/dashboard/students/page.tsx`](src/app/dashboard/students/page.tsx) — may need to pass `yearId` down to the modal
- Design patterns: buttons use `bg-primary text-neutral`, inputs use `border-primary/20 focus:ring-accent`
- `exceljs` is already in `package.json`; `papaparse` needs to be added
- Column name matching (case-insensitive): `ADMNO` → `stAdmNo`, `NAME` → `stName`, `STREAM` → `stream`, `INDEX NUMBER` → `indexNo`, `ASSESSMENT NO` → `assessmentNo`

---

### Sub-Task 6 — Enhanced Filtering on Student List

**Status:** `[ ] pending`

**Intent:**
Make the student list more usable at scale by ensuring all filter controls are visible, well-organized, and include the stream-level filter (which already exists in code but may need UI polish). This sub-task is additive only — the existing filter code is not replaced.

**Expected Outcomes:**
- Filter bar shows: Search input, Class dropdown, Stream dropdown (dependent on class), Year dropdown, Status toggle (admin only)
- Stream dropdown updates its options when class changes (existing behavior preserved)
- "Clear Filters" button resets all filters at once
- Filter state is reflected in the URL query string so the page is shareable/bookmarkable

**Todo List:**
1. Read [`src/components/students/StudentsTable.tsx`](src/components/students/StudentsTable.tsx) to see the current filter bar UI
2. Verify all five filters are visible and labeled clearly
3. Add a "Clear Filters" button that resets `search`, `filterClass`, `filterStream`, `filterYear` to empty
4. Sync filter state to URL search params using `useRouter` and `useSearchParams` (Next.js App Router pattern)
5. Initialize filter state from URL params on component mount

**Relevant Context:**
- [`src/components/students/StudentsTable.tsx`](src/components/students/StudentsTable.tsx) — has `filterClass`, `filterStream`, `filterYear`, `search` state
- [`src/app/api/students/route.ts`](src/app/api/students/route.ts) — already accepts all these as query params
- Next.js App Router URL sync: `useSearchParams()` + `router.push()` with new params

---

### Sub-Task 7 — Bulk Delete UI on Student List

**Status:** `[ ] pending`

**Intent:**
Add a "Delete Students" toggle mode to the student list. When active, each student row shows a checkbox. Selected students can be deleted via a "Delete X Selected" button that shows confirmation, then progress animation, then refreshes the list.

**Expected Outcomes:**
- "Delete Students" button (admin-only, destructive red styling) appears in the student list header
- Clicking it enters "delete mode": checkboxes appear on each student row, a "Select All" checkbox appears in the table header
- "Delete X Selected" button shows count of selected students; disabled when none selected
- Clicking "Delete X Selected" opens a confirmation dialog (inline or modal): "Permanently delete X students and all their records? This cannot be undone."
- On confirm: POST to `/api/students/bulk-delete`, button shows spinner + "Deleting..." text
- On completion: success toast/banner, list refreshes, delete mode exits automatically
- Deletion removes students from the visible list immediately (optimistic or post-refresh)

**Todo List:**
1. Add `deleteMode` boolean state to [`src/components/students/StudentsTable.tsx`](src/components/students/StudentsTable.tsx)
2. Add "Delete Students" button (admin-only, shown only to `admin` role) that toggles `deleteMode`
3. In delete mode: render a checkbox `<input type="checkbox">` on each row (table view and card view)
4. Add "Select All / Deselect All" checkbox in the table header
5. Track `selectedAdmNos: Set<string>` state
6. Add "Delete X Selected" button — disabled when set is empty, red styling
7. Add inline confirmation banner/dialog with warning text
8. On confirm: call `DELETE /api/students/bulk-delete` with the selected IDs
9. Show animated progress: spinner + "Deleting students..." with a count-down effect
10. On success: show success message, clear selection, exit delete mode, refresh student list
11. Add "Cancel" button to exit delete mode without deleting

**Relevant Context:**
- [`src/components/students/StudentsTable.tsx`](src/components/students/StudentsTable.tsx) — main component to modify
- Role check for delete mode: only render the "Delete Students" button when `session.role === "admin"`
- The session/role is available via `getSession()` or passed as a prop from the page
- Styling: destructive actions use `bg-red-600 text-white hover:bg-red-700`
- Mobile card view also needs checkboxes — add a checkbox to the top of each card

---

### Sub-Task 8 — Update Single-Student Form and API for `assessmentNo`

**Status:** `[ ] pending`

**Intent:**
The existing single-student add/edit form and the GET/PATCH API should be updated to surface and persist the new `assessmentNo` field. The field should only appear when the selected class is G10, G11, or G12.

**Expected Outcomes:**
- `StudentForm.tsx` conditionally shows an "Assessment Number" input when `cClass` is G10/G11/G12
- The field is required for CBC classes, optional (hidden) for 8-4-4 classes
- `POST /api/students` and `PATCH /api/students/[id]` accept and persist `assessmentNo`
- Student list table/cards show the Assessment Number column for CBC students
- Edit form pre-populates `assessmentNo` from existing data

**Todo List:**
1. Update [`src/components/students/StudentForm.tsx`](src/components/students/StudentForm.tsx) — add `assessmentNo` field, show only when CBC class selected
2. Update [`src/app/api/students/route.ts`](src/app/api/students/route.ts) POST handler to accept and store `assessmentNo`
3. Update [`src/app/api/students/[id]/route.ts`](src/app/api/students/%5Bid%5D/route.ts) PATCH handler to accept `assessmentNo` updates
4. Update [`src/components/students/StudentsTable.tsx`](src/components/students/StudentsTable.tsx) to show `assessmentNo` column/field for CBC students

**Relevant Context:**
- CBC class codes: `G10`, `G11`, `G12`
- 8-4-4 class codes: `F3`, `F4`
- [`src/components/students/StudentForm.tsx`](src/components/students/StudentForm.tsx) — already has class-dependent stream dropdown; same pattern applies
- `assessmentNo` validation: format `A\d{9}` (letter A followed by 9 digits), though a simple non-empty check is sufficient

---

## Implementation Order

```
Sub-Task 1 (Schema migration)
    → Sub-Task 2 (Template files)
    → Sub-Task 3 (Bulk upload API)
    → Sub-Task 4 (Bulk delete API)
    → Sub-Task 5 (Upload modal UI)
    → Sub-Task 6 (Filter enhancements)
    → Sub-Task 7 (Delete UI)
    → Sub-Task 8 (Single form assessmentNo)
```

Sub-tasks 2, 3, 4 can run in parallel after Sub-Task 1 completes.
Sub-tasks 5, 6, 7, 8 depend on their respective API sub-tasks being done first.
