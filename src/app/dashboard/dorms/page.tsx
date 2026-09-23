"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { EntityTable, type Column } from "@/components/ui/EntityTable";
import { Pagination } from "@/components/ui/Pagination";

interface Dorm {
  dormCode: string;
  dName: string;
  capacity: number;
  patron: string;
  _count: { beds: number; cubes: number };
}

interface DormFormData {
  dormCode: string;
  dName: string;
  capacity: string;
  patron: string;
}

// ── Dorm Form ──────────────────────────────────────────────────────────────
function DormForm({
  defaultValues,
  mode,
  onSuccess,
  onCancel,
}: {
  defaultValues?: Partial<DormFormData>;
  mode: "create" | "edit";
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<DormFormData>({
    dormCode: defaultValues?.dormCode ?? "",
    dName: defaultValues?.dName ?? "",
    capacity: defaultValues?.capacity ?? "",
    patron: defaultValues?.patron ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(key: keyof DormFormData, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.dormCode.trim() || !form.dName.trim() || !form.capacity || !form.patron.trim()) {
      setError("All fields are required");
      return;
    }
    setSaving(true);
    try {
      const url = mode === "create" ? "/api/dorms" : `/api/dorms/${defaultValues?.dormCode}`;
      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, capacity: Number(form.capacity) }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error"); return; }
      onSuccess();
    } catch { setError("Network error"); } finally { setSaving(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      {error && <div className="text-sm text-red-600 border border-red-300 bg-red-50 px-3 py-2 rounded-sm">{error}</div>}
      <FormRow label="Dorm Code" required>
        <input value={form.dormCode} onChange={(e) => set("dormCode", e.target.value)}
          disabled={mode === "edit"} placeholder="e.g. DORM_A"
          className={iCls(mode === "edit")} />
        {mode === "edit" && <p className="text-xs text-neutral-text/40 mt-1">Dorm code cannot be changed.</p>}
      </FormRow>
      <FormRow label="Dorm Name" required>
        <input value={form.dName} onChange={(e) => set("dName", e.target.value)}
          placeholder="e.g. Simba Dormitory" className={iCls()} />
      </FormRow>
      <FormRow label="Capacity (beds)" required>
        <input type="number" min={1} value={form.capacity} onChange={(e) => set("capacity", e.target.value)}
          placeholder="e.g. 120" className={iCls()} />
      </FormRow>
      <FormRow label="Patron (teacher name)" required>
        <input value={form.patron} onChange={(e) => set("patron", e.target.value)}
          placeholder="e.g. Mr. Kamau" className={iCls()} />
      </FormRow>
      <div className="flex gap-3 pt-1">
        <button type="submit" disabled={saving} className="bg-primary text-neutral text-sm font-semibold px-5 py-2 rounded-sm hover:bg-primary/90 transition-colors disabled:opacity-50">
          {saving ? "Saving…" : mode === "create" ? "Add Dorm" : "Save Changes"}
        </button>
        <button type="button" onClick={onCancel} className="text-sm border border-primary/15 px-4 py-2 rounded-sm hover:bg-primary/5 transition-colors">Cancel</button>
      </div>
    </form>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function DormsPage() {
  const router = useRouter();
  const [dorms, setDorms] = useState<Dorm[]>([]);
  const [loading, setLoading] = useState(true);
  const [panel, setPanel] = useState<{ mode: "create" | "edit"; dorm?: Dorm } | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 50;

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    const res = await fetch(`/api/dorms?${params}`);
    const data = await res.json();
    setDorms(data.dorms ?? data);
    setTotal(data.total ?? (data.dorms ?? data).length);
    setLoading(false);
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const COLUMNS: Column<Dorm>[] = [
    { key: "dormCode", label: "Code", render: (d) => <span className="font-mono text-xs">{d.dormCode}</span> },
    { key: "dName", label: "Name", render: (d) => <span className="font-medium text-primary">{d.dName}</span> },
    { key: "capacity", label: "Capacity", render: (d) => d.capacity, mobileHide: false },
    { key: "patron", label: "Patron", render: (d) => d.patron },
    { key: "cubes", label: "Cubes", render: (d) => d._count.cubes, mobileHide: true },
    { key: "beds", label: "Beds", render: (d) => d._count.beds, mobileHide: true },
    {
      key: "actions", label: "", render: (d) => (
        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => setPanel({ mode: "edit", dorm: d })}
            className="text-xs text-primary underline hover:text-accent transition-colors">Edit</button>
          <DeleteButton
            endpoint={`/api/dorms/${d.dormCode}`}
            label={d.dName}
            cubeCount={d._count.cubes}
            bedCount={d._count.beds}
            onDeleted={load}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-primary">Dormitories</h1>
          <p className="text-xs text-neutral-text/50 mt-0.5">Manage dorm buildings, capacity, and patrons</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => router.push("/dashboard/cubes")} className="border border-primary/20 text-primary text-sm px-3 py-1.5 rounded-sm hover:bg-primary/5 transition-colors">Cubes →</button>
          <button onClick={() => router.push("/dashboard/beds")} className="border border-primary/20 text-primary text-sm px-3 py-1.5 rounded-sm hover:bg-primary/5 transition-colors">Beds →</button>
          <button onClick={() => setPanel({ mode: "create" })} className="bg-accent text-primary text-sm font-semibold px-4 py-1.5 rounded-sm hover:bg-accent/90 transition-colors">+ Add Dorm</button>
        </div>
      </div>

      {panel && (
        <div className="border border-primary/15 bg-primary/5 rounded-sm p-5 mb-6">
          <h2 className="text-sm font-semibold text-primary mb-4">{panel.mode === "create" ? "Add New Dorm" : `Edit — ${panel.dorm?.dName}`}</h2>
          <DormForm
            mode={panel.mode}
            defaultValues={panel.dorm ? { dormCode: panel.dorm.dormCode, dName: panel.dorm.dName, capacity: String(panel.dorm.capacity), patron: panel.dorm.patron } : undefined}
            onSuccess={() => { setPanel(null); load(); }}
            onCancel={() => setPanel(null)}
          />
        </div>
      )}

      <Pagination
        page={page}
        totalPages={Math.ceil(total / LIMIT)}
        total={total}
        limit={LIMIT}
        onPage={(p) => { setPage(p); window.scrollTo(0, 0); }}
      />
      <EntityTable columns={COLUMNS} rows={dorms} rowKey={(d) => d.dormCode} loading={loading}
        emptyIcon="🏠" emptyTitle="No dormitories yet" emptyDescription="Add your first dorm to get started." />
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

function FormRow({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-neutral-text mb-1">
        {label}{required && <span className="text-accent ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
function iCls(disabled = false) {
  return `w-full border border-primary/20 rounded-sm px-3 py-1.5 text-sm text-neutral-text bg-neutral focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${disabled ? "opacity-40 cursor-not-allowed" : ""}`;
}

// ── Delete button with inline confirm ─────────────────────────────────────

function DeleteButton({
  endpoint,
  label,
  cubeCount,
  bedCount,
  onDeleted,
}: {
  endpoint: string;
  label: string;
  cubeCount?: number;
  bedCount?: number;
  onDeleted: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!confirm) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setConfirm(false); setError(null);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [confirm]);

  const hasLinked = (cubeCount ?? 0) > 0 || (bedCount ?? 0) > 0;

  if (hasLinked) {
    const parts = [];
    if (cubeCount) parts.push(`${cubeCount} cube${cubeCount !== 1 ? "s" : ""}`);
    if (bedCount) parts.push(`${bedCount} bed${bedCount !== 1 ? "s" : ""}`);
    return (
      <span className="text-xs text-neutral-text/30 cursor-not-allowed"
        title={`Delete the ${parts.join(" and ")} in this dorm first`}>
        Delete
      </span>
    );
  }

  if (!confirm) {
    return (
      <button onClick={() => setConfirm(true)}
        className="text-xs text-red-600 hover:text-red-800 transition-colors">Delete</button>
    );
  }

  async function doDelete() {
    setDeleting(true); setError(null);
    try {
      const res = await fetch(endpoint, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Delete failed"); setDeleting(false); return; }
      onDeleted();
    } catch { setError("Network error"); } finally { setDeleting(false); }
  }

  return (
    <div ref={ref} className="relative">
      {error && (
        <div className="absolute bottom-full right-0 mb-1 z-10 bg-red-50 border border-red-300 text-red-700 text-xs px-3 py-2 rounded-sm w-72 shadow-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-400 hover:text-red-600">✕</button>
        </div>
      )}
      <div className="flex items-center gap-1.5 bg-red-50 border border-red-300 rounded-sm px-2 py-0.5">
        <span className="text-xs text-red-700 font-medium whitespace-nowrap">Delete {label}?</span>
        <button onClick={doDelete} disabled={deleting}
          className="text-xs bg-red-600 text-white px-1.5 py-0.5 rounded-sm hover:bg-red-700 transition-colors disabled:opacity-50">
          {deleting ? "…" : "Yes"}
        </button>
        <button onClick={() => { setConfirm(false); setError(null); }}
          className="text-xs text-red-600 hover:text-red-800">No</button>
      </div>
    </div>
  );
}
