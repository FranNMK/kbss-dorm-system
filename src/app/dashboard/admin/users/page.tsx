"use client";

/**
 * /dashboard/admin/users
 * List all users, create new users, and edit role/dormScope.
 */
import { useState, useEffect, useCallback } from "react";
import { EmptyState, LoadingRows, LoadingCards } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  dormScope: string[] | null;
  createdAt: string;
}

const ROLE_OPTIONS = ["admin", "dorm_master", "unassigned"];

function roleLabel(r: string) {
  return r === "dorm_master" ? "Dorm Master" : r === "admin" ? "Admin" : "Unassigned";
}
function roleBadge(r: string) {
  if (r === "admin") return "bg-primary text-neutral";
  if (r === "dorm_master") return "bg-accent/20 text-primary";
  return "bg-primary/10 text-primary/50";
}

// ── Create User Form ────────────────────────────────────────────────────────
function CreateUserForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("dorm_master");
  const [dormScopeRaw, setDormScopeRaw] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !name.trim() || !password) {
      setError("Email, name, and password are required");
      return;
    }
    setSaving(true);
    setError(null);

    // Parse dormScope: comma-separated dorm codes → string[]
    const dormScope =
      role === "dorm_master" && dormScopeRaw.trim()
        ? dormScopeRaw.split(",").map((s) => s.trim()).filter(Boolean)
        : null;

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), name: name.trim(), password, role, dormScope }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error"); return; }
      onSuccess();
    } catch { setError("Network error"); } finally { setSaving(false); }
  }

  const fieldCls =
    "w-full border border-primary/20 rounded-sm px-3 py-1.5 text-sm bg-neutral focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      {error && (
        <div className="text-sm text-red-600 border border-red-300 bg-red-50 px-3 py-2 rounded-sm">{error}</div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-text mb-1">Name <span className="text-accent">*</span></label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className={fieldCls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-text mb-1">Email <span className="text-accent">*</span></label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="staff@kbss.ac.ke" className={fieldCls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-text mb-1">Password <span className="text-accent">*</span></label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Temporary password" className={fieldCls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-text mb-1">Role <span className="text-accent">*</span></label>
          <select value={role} onChange={(e) => setRole(e.target.value)} className={fieldCls}>
            {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
          </select>
        </div>
      </div>
      {role === "dorm_master" && (
        <div>
          <label className="block text-sm font-medium text-neutral-text mb-1">
            Dorm Scope <span className="text-neutral-text/40">(comma-separated dorm codes)</span>
          </label>
          <input
            value={dormScopeRaw}
            onChange={(e) => setDormScopeRaw(e.target.value)}
            placeholder="e.g. DORM_A, DORM_B"
            className={fieldCls}
          />
          <p className="text-xs text-neutral-text/40 mt-0.5">Leave blank for no restriction.</p>
        </div>
      )}
      <div className="flex gap-3 pt-1">
        <button type="submit" disabled={saving}
          className="bg-primary text-neutral text-sm font-semibold px-5 py-2 rounded-sm hover:bg-primary/90 transition-colors disabled:opacity-50">
          {saving ? "Creating…" : "Create User"}
        </button>
        <button type="button" onClick={onCancel}
          className="text-sm border border-primary/15 px-4 py-2 rounded-sm hover:bg-primary/5 transition-colors">Cancel</button>
      </div>
    </form>
  );
}

// ── Edit Role Modal ─────────────────────────────────────────────────────────
function EditRoleModal({ user, onClose, onSaved }: { user: User; onClose: () => void; onSaved: () => void }) {
  const [role, setRole] = useState(user.role);
  const [dormScopeRaw, setDormScopeRaw] = useState(
    Array.isArray(user.dormScope) ? user.dormScope.join(", ") : "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const dormScope =
      role === "dorm_master" && dormScopeRaw.trim()
        ? dormScopeRaw.split(",").map((s) => s.trim()).filter(Boolean)
        : null;

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, dormScope }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error"); return; }
      onSaved();
      onClose();
    } catch { setError("Network error"); } finally { setSaving(false); }
  }

  const fieldCls =
    "w-full border border-primary/20 rounded-sm px-3 py-1.5 text-sm bg-neutral focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-primary/40" onClick={onClose}>
      <div className="bg-neutral border border-primary/15 rounded-sm p-6 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-sm font-bold text-primary mb-4">Edit Role — {user.name}</h2>
        {error && <div className="text-sm text-red-600 border border-red-300 bg-red-50 px-3 py-2 rounded-sm mb-3">{error}</div>}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-neutral-text mb-1">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className={fieldCls}>
              {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
            </select>
          </div>
          {role === "dorm_master" && (
            <div>
              <label className="block text-sm font-medium text-neutral-text mb-1">
                Dorm Scope <span className="text-neutral-text/40">(comma-separated)</span>
              </label>
              <input value={dormScopeRaw} onChange={(e) => setDormScopeRaw(e.target.value)} placeholder="DORM_A, DORM_B" className={fieldCls} />
            </div>
          )}
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={handleSave} disabled={saving}
            className="bg-primary text-neutral text-sm font-semibold px-4 py-2 rounded-sm hover:bg-primary/90 transition-colors disabled:opacity-50">
            {saving ? "Saving…" : "Save Changes"}
          </button>
          <button onClick={onClose} className="text-sm border border-primary/15 px-4 py-2 rounded-sm hover:bg-primary/5 transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 50;

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    const res = await fetch(`/api/admin/users?${params}`);
    const data = await res.json();
    setUsers(data.users ?? (Array.isArray(data) ? data : []));
    setTotal(data.total ?? (data.users ?? data).length);
    setLoading(false);
  }, [page]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-primary">User Management</h1>
          <p className="text-xs text-neutral-text/50 mt-0.5">Manage staff accounts, roles, and dorm scope</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="bg-accent text-primary text-sm font-semibold px-4 py-2 rounded-sm hover:bg-accent/90 transition-colors">
          + New User
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="border border-primary/15 bg-primary/5 rounded-sm p-5 mb-6">
          <h2 className="text-sm font-semibold text-primary mb-4">Create New User</h2>
          <CreateUserForm onSuccess={() => { setShowCreate(false); load(); }} onCancel={() => setShowCreate(false)} />
        </div>
      )}

      {/* Edit modal */}
      {editUser && (
        <EditRoleModal user={editUser} onClose={() => setEditUser(null)} onSaved={load} />
      )}

      {error && (
        <div className="border border-red-300 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-sm mb-4">
          {error} <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      {/* Top pagination */}
      <Pagination
        page={page}
        totalPages={Math.ceil(total / LIMIT)}
        total={total}
        limit={LIMIT}
        onPage={(p) => { setPage(p); window.scrollTo(0, 0); }}
      />

      {/* Desktop table */}
      <div className="hidden md:block border border-primary/15 rounded-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-primary text-neutral text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-2.5">Name</th>
              <th className="text-left px-4 py-2.5">Email</th>
              <th className="text-left px-4 py-2.5">Role</th>
              <th className="text-left px-4 py-2.5">Dorm Scope</th>
              <th className="text-left px-4 py-2.5">Created</th>
              <th className="px-4 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <LoadingRows cols={6} rows={5} />
            ) : users.length === 0 ? (
              <tr><td colSpan={6}>
                <EmptyState icon="👥" title="No users" description="Create the first user account." />
              </td></tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-t border-primary/10 hover:bg-primary/5 transition-colors">
                  <td className="px-4 py-2.5 font-medium text-primary">{u.name}</td>
                  <td className="px-4 py-2.5 text-neutral-text/70 text-xs">{u.email}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-sm font-medium ${roleBadge(u.role)}`}>
                      {roleLabel(u.role)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-neutral-text/60">
                    {Array.isArray(u.dormScope) && u.dormScope.length > 0
                      ? u.dormScope.join(", ")
                      : <span className="text-neutral-text/30">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-neutral-text/50">
                    {new Date(u.createdAt).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => setEditUser(u)}
                      className="text-xs text-primary underline hover:text-accent transition-colors">
                      Edit Role
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {loading ? <LoadingCards count={4} /> : users.length === 0 ? (
          <EmptyState icon="👥" title="No users" description="Create the first user account." />
        ) : users.map((u) => (
          <div key={u.id} className="border border-primary/15 rounded-sm p-4">
            <div className="flex items-start justify-between mb-1">
              <div>
                <p className="font-semibold text-primary text-sm">{u.name}</p>
                <p className="text-xs text-neutral-text/50">{u.email}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-sm font-medium shrink-0 ${roleBadge(u.role)}`}>
                {roleLabel(u.role)}
              </span>
            </div>
            {Array.isArray(u.dormScope) && u.dormScope.length > 0 && (
              <p className="text-xs text-neutral-text/60 mt-1 mb-2">
                <span className="text-neutral-text/40">Scope:</span> {u.dormScope.join(", ")}
              </p>
            )}
            <button onClick={() => setEditUser(u)}
              className="text-xs border border-primary/15 text-primary px-3 py-1 rounded-sm hover:bg-primary/5 transition-colors mt-2">
              Edit Role
            </button>
          </div>
        ))}
      </div>
      <Pagination
        page={page}
        totalPages={Math.ceil(total / LIMIT)}
        total={total}
        limit={LIMIT}
        onPage={(p) => { setPage(p); window.scrollTo(0, 0); }}
      />
    </div>
  );
}
