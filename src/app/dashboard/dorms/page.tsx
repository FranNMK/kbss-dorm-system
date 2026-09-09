"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { EntityTable, type Column } from "@/components/ui/EntityTable";

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

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/dorms");
    const data = await res.json();
    setDorms(data);
    setLoading(false);
  }, []);

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
        <button onClick={(e) => { e.stopPropagation(); setPanel({ mode: "edit", dorm: d }); }}
          className="text-xs text-primary underline hover:text-accent transition-colors">Edit</button>
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

      <EntityTable columns={COLUMNS} rows={dorms} rowKey={(d) => d.dormCode} loading={loading}
        emptyIcon="🏠" emptyTitle="No dormitories yet" emptyDescription="Add your first dorm to get started." />
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
