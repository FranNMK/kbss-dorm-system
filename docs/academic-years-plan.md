# Academic Year Management Plan

## Top-Level Overview

**Goal:** Two connected capabilities:

1. **Academic Year Management Page** (`/dashboard/admin/academic-years`) — a dedicated admin page to add new years, edit year labels, mark one year as "current", and delete years (blocked when linked data exists). Accessible via the existing admin sidebar.

2. **Student Year Reassignment** — on the Students tab, a "Reassign Year" action that lets an admin bulk-update the `yearId` on students, either by selecting specific students via checkboxes or by applying the current filter set (all students matching the active class/stream/status filter). The year dropdown on the Students tab already works; this adds the ability to *change* years, not just *filter* by them.

**Scope:**
- New API routes: `PATCH /api/academic-years/[yearId]` (edit label / mark current) and `DELETE /api/academic-years/[yearId]` (blocked if linked students/assignments exist)
- New API route: `POST /api/students/bulk-reassign-year` (bulk year update for selected or filtered students)
- New page: `src/app/dashboard/admin/academic-years/page.tsx`
- Update sidebar nav + dashboard home card
- New modal: `ReassignYearModal.tsx` on the Students tab

**Non-goals:**
- Changing how `isCurrent` affects other parts of the app (it is already used by the student form auto-select)
- Any changes to the AcademicYear Prisma schema (the model is fine as-is)
- Cascade-deleting students when a year is deleted (admin must first move or delete students)

---

## Sub-Tasks

---

### Sub-Task 1 — Academic Year API: PATCH + DELETE

**Status:** `[ ] pending`

**Intent:**
The existing GET and POST routes are sufficient for creating and reading years, but there is no way to edit a year's label, change which year is "current", or delete a year. This sub-task adds those missing API capabilities.

**Expected Outcomes:**
- `PATCH /api/academic-years/[yearId]` accepts `{ label?: string; isCurrent?: boolean }`, updates the year, and — if `isCurrent: true` — atomically clears `isCurrent` on all other years in the same transaction
- `DELETE /api/academic-years/[yearId]` first checks whether any `Student`, `BedsAssignment`, `DormSecretary`, or `DormCleaner` rows reference this year; if any exist, returns 409 with a descriptive error; otherwise deletes the year
- Both routes are admin-only

**Todo List:**
1. Create `src/app/api/academic-years/[yearId]/route.ts`
2. Implement `PATCH` handler: validate body, check year exists (404 if not), run `prisma.$transaction` that un-marks existing current year then updates the target year
3. Implement `DELETE` handler: count linked students, bedsAssignments, dormSecretaries, dormCleaners; return 409 with counts if any > 0; otherwise `prisma.academicYear.delete`
4. Apply `requireRole([UserRole.admin])` on both methods

**Relevant Context:**
- Existing route pattern: `src/app/api/academic-years/route.ts` — same auth pattern
- isCurrent toggle pattern: already in POST handler (lines 35-40 of same file) — replicate in PATCH
- Cascade safety counts pattern: similar to how bed validation works in bed assignment API

---

### Sub-Task 2 — Bulk Year Reassign API

**Status:** `[ ] pending`

**Intent:**
Allow bulk-updating the `yearId` on a set of students. The API accepts either an explicit list of `stAdmNo` values (checkbox selection) or a filter object (class, stream, current yearId, status) to match students dynamically.

**Expected Outcomes:**
- `POST /api/students/bulk-reassign-year` accepts `{ targetYearId: number; stAdmNos?: string[]; filter?: { cClass?: string; stream?: string; yearId?: number; status?: string } }`
- Exactly one of `stAdmNos` or `filter` must be provided; returns 400 otherwise
- Verifies `targetYearId` exists (404 if not)
- Performs `prisma.student.updateMany` with the appropriate `where` clause
- Returns `{ updated: number }`
- Writes one `AuditLog` entry
- Admin only

**Todo List:**
1. Create `src/app/api/students/bulk-reassign-year/route.ts`
2. Validate body — require exactly one of `stAdmNos` or `filter`
3. Verify `targetYearId` exists in `AcademicYear`
4. Build the Prisma `where` clause: if `stAdmNos` provided use `{ stAdmNo: { in: stAdmNos } }`; if `filter` provided use the same filter-to-where mapping as `GET /api/students`
5. Run `prisma.student.updateMany({ where, data: { yearId: targetYearId } })`
6. Write `AuditLog` with action `"bulk_reassign_year"`, include target year and either `stAdmNos` list or filter criteria in `details`
7. Return `{ updated: result.count }`

**Relevant Context:**
- Existing bulk pattern: `src/app/api/admin/promote/route.ts` — transaction + audit log
- Filter-to-where mapping: `src/app/api/students/route.ts` GET handler (lines 34-50) — replicate same logic
- Auth helper: `getSessionUser()` from `src/lib/auth.ts`

---

### Sub-Task 3 — Academic Year Management Page

**Status:** `[ ] pending`

**Intent:**
Build a dedicated admin page at `/dashboard/admin/academic-years` where admins can view all years, add new ones, edit labels, mark one as current, and delete years that have no linked data.

**Expected Outcomes:**
- Page lists all academic years in a table: Year Label | Status (current badge) | Linked Students count | Actions
- "Add Year" form inline at the top: label input + "Mark as current" checkbox + Save button
- Each row has: Edit label (inline or inline toggle), "Set as Current" button (disabled if already current), Delete button (disabled/greyed with tooltip if linked students > 0)
- Editing a label is done inline (click label → text input → save / cancel)
- Deleting a year with linked data shows an error message: "Cannot delete — X students are assigned to this year. Reassign or delete those students first."
- All mutations refresh the list immediately after success
- Page is protected by the existing `/dashboard/admin/layout.tsx` guard (no extra auth needed)

**Todo List:**
1. Create `src/app/dashboard/admin/academic-years/page.tsx` as a client component (needs mutation state)
2. Fetch years from `GET /api/academic-years` on mount; include a count of linked students per year by adding a `_count` include on the API or fetching a separate endpoint
3. Render years table with label, current badge, student count, and action buttons
4. Implement inline label editing: clicking the label switches to a text input; Save calls `PATCH /api/academic-years/[yearId]`
5. Implement "Set as Current" button: calls `PATCH /api/academic-years/[yearId]` with `{ isCurrent: true }`
6. Implement "Delete" button: calls `DELETE /api/academic-years/[yearId]`; on 409 response show the "cannot delete" error inline on that row; on success remove row from list
7. Implement "Add Year" form at the top of the page
8. Match the project's existing Tailwind design system (primary/neutral/accent color tokens)

**Relevant Context:**
- Admin layout guard: `src/app/dashboard/admin/layout.tsx` — already protects all `/dashboard/admin/*` routes
- Design patterns: `src/app/dashboard/admin/users/page.tsx` — inline list + add form (same structure)
- API route: `src/app/api/academic-years/route.ts` — GET (list) + POST (create)
- New API: `src/app/api/academic-years/[yearId]/route.ts` (Sub-Task 1)

**Note on student count per year:** The PATCH route from Sub-Task 1 returns the year. To show student counts on this page, either add `_count: { select: { students: true } }` to the GET query or call a dedicated count. The simplest approach: update the GET handler to include `_count` so the management page gets it without an extra request.

---

### Sub-Task 4 — Student Year Reassign Modal

**Status:** `[ ] pending`

**Intent:**
Add a "Reassign Year" button to the Students tab toolbar that opens a modal. The modal supports two modes: reassigning all students currently matching the active filter, or reassigning only the students selected via checkboxes (reusing the existing delete-mode checkbox selection infrastructure).

**Expected Outcomes:**
- "Reassign Year" button appears in the student list toolbar (next to "Upload Students" and "Delete Students")
- The modal shows two tabs/options: "Selected students" (shows count of checked rows) and "All matching filter" (shows current filter summary and student count)
- A "Target Year" dropdown lists all academic years
- Confirm button calls `POST /api/students/bulk-reassign-year`
- After success: shows `X students moved to [year label]`, refreshes the list, clears checkboxes
- The modal is separate from the delete-mode — it can be opened whether or not delete mode is active, and it reads the current checkbox selection if any students are already selected

**Todo List:**
1. Create `src/components/students/ReassignYearModal.tsx`
2. Props: `{ selectedAdmNos: Set<string>; currentFilter: { cClass: string; stream: string; yearId: string; search: string; status: string }; filterCount: number; onClose: () => void; onSuccess: () => void }`
3. Fetch years from `/api/academic-years` inside the modal on mount
4. Build two-option UI: "Reassign selected (N)" vs "Reassign all matching filter (N)"
5. Target year dropdown — exclude the year that would be a no-op (the already-selected filter year if applicable)
6. Submit: call `POST /api/students/bulk-reassign-year` with either `stAdmNos` or `filter` body depending on selection mode
7. Show result summary and a "Close & Refresh" button
8. Add "Reassign Year" button to `StudentsTable.tsx` toolbar (visible to admin only)
9. Wire the modal open state and pass `selectedAdmNos`, current filter state, and `total` as props

**Relevant Context:**
- `src/components/students/StudentsTable.tsx` — toolbar section and existing `selectedAdmNos` state
- `src/components/students/BulkUploadModal.tsx` — exact same 5-phase modal pattern to follow for animations and layout
- Current filter state in StudentsTable: `search`, `filterClass`, `filterStream`, `filterYear`, `showArchived`
- Total count is already in state as `total`

---

### Sub-Task 5 — Navigation + Dashboard Updates

**Status:** `[ ] pending`

**Intent:**
Make the new Academic Year management page discoverable by adding it to the sidebar navigation and the dashboard home page card grid.

**Expected Outcomes:**
- Sidebar shows "Academic Years" link under the admin section (admin-only)
- Dashboard home page shows an "Academic Years" card in the Admin Actions section
- Both link to `/dashboard/admin/academic-years`

**Todo List:**
1. Add `{ href: "/dashboard/admin/academic-years", label: "Academic Years", adminOnly: true }` to `NAV_ITEMS` in `src/components/layout/DashboardLayoutClient.tsx`
2. Add an "Academic Years" card to the Admin Actions section in `src/app/dashboard/page.tsx` — follow the exact same card pattern as the existing admin cards

**Relevant Context:**
- `src/components/layout/DashboardLayoutClient.tsx` — `NAV_ITEMS` array
- `src/app/dashboard/page.tsx` — admin section card grid
- The new entry must have `adminOnly: true` so dorm_masters do not see it

---

## Implementation Order

```
Sub-Task 1 (PATCH + DELETE API for years)
Sub-Task 2 (Bulk reassign year API)   ← parallel with Sub-Task 1
    ↓
Sub-Task 3 (Academic Year management page)
Sub-Task 4 (Reassign Year modal on Students tab)  ← parallel with Sub-Task 3
    ↓
Sub-Task 5 (Nav + Dashboard updates)
```

Sub-Tasks 1 and 2 are independent and can be built in parallel.
Sub-Tasks 3 and 4 depend on their respective API sub-tasks.
Sub-Task 5 has no code dependency and can go in at any point, but is most useful last.
