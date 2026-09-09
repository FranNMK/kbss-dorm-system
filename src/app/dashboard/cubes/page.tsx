"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { EntityTable, type Column } from "@/components/ui/EntityTable";

interface Dorm { dormCode: string; dName: string }
interface Cube {
  cubeId: number;
  dormCode: string;
  location: string;
  dorm: { dName: string };
  _count: { beds: number };
}

function CubeForm({
  dorms,
  defaultValues,
  mode,
  onSuccess,
  onCancel,
}: {
  dorms: Dorm[];
  defaultValues?: Partial<{ dormCode: string; location: string; cubeId?: number }>;
  mode: "create" | "edit";
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [dormCode, setDormCode] = useState(defaultValues?.dormCode ?? "");
  const [location, setLocation] = useState(defaultValues?.location ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dormCode || !location.trim()) { setError("All fields are required"); return; }
    setSaving(true);
    try {
      const url = mode === "create" ? "/api/cubes" : `/api/cubes/${defaultValues?.cubeId}`;
      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dormCode, location: location.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error"); return; }
      onSuccess();
    } catch { setError("Network error"); } finally { setSaving(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      {error && <div className="text-sm text-red-600 border border-red-300 bg-red-50 px-3 py-2 rounded-sm">{error}</div>}
      <div>
        <label className="block text-sm font-medium text-neutral-text mb-1">Dorm <span className="text-accent">*</span></label>
        <select value={dormCode} onChange={(e) => setDormCode(e.target.value)}
          disabled={mode === "edit"}
          className={`w-full border border-primary/20 rounded-sm px-3 py-1.5 text-sm bg-neutral focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${mode === "edit" ? "opacity-40" : ""}`}>
          <option value="">Select dorm…</option>
          {dorms.map((d) => <option key={d.dormCode} value={d.dormCode}>{d.dName} ({d.dormCode})</option>)}
        </select>
        {mode === "edit" && <p className="text-xs text-neutral-text/40 mt-1">Dorm cannot be changed after creation.</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral-text mb-1">Location <span className="text-accent">*</span></label>
        <input value={location} onChange={(e) => { setLocation(e.target.value); setError(null); }}
          placeholder="e.g. Block A, Ground Floor"
          className="w-full border border-primary/20 rounded-sm px-3 py-1.5 text-sm bg-neutral focus:outline-none focus-visible:ring-2 focus-visible:ring-accent" />
      </div>
      <div className="flex gap-3 pt-1">
        <button type="submit" disabled={saving} className="bg-primary text-neutral text-sm font-semibold px-5 py-2 rounded-sm hover:bg-primary/90 transition-colors disabled:opacity-50">
          {saving ? "Saving…" : mode === "create" ? "Add Cube" : "Save Changes"}
        </button>
        <button type="button" onClick={onCancel} className="text-sm border border-primary/15 px-4 py-2 rounded-sm hover:bg-primary/5 transition-colors">Cancel</button>
      </div>
    </form>
  );
}

export default function CubesPage() {
  const router = useRouter();
  const [cubes, setCubes] = useState<Cube[]>([]);
  const [dorms, setDorms] = useState<Dorm[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDorm, setFilterDorm] = useState("");
  const [panel, setPanel] = useState<{ mode: "create" | "edit"; cube?: Cube } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = filterDorm ? `?dormCode=${filterDorm}` : "";
    const [cubesRes, dormsRes] = await Promise.all([fetch(`/api/cubes${params}`), fetch("/api/dorms")]);
    const [cubesData, dormsData] = await Promise.all([cubesRes.json(), dormsRes.json()]);
    setCubes(cubesData);
    setDorms(dormsData);
    setLoading(false);
  }, [filterDorm]);

  useEffect(() => { load(); }, [load]);

  const COLUMNS: Column<Cube>[] = [
    { key: "cubeId", label: "ID", render: (c) => <span className="font-mono text-xs">#{c.cubeId}</span>, mobileHide: true },
    { key: "dorm", label: "Dorm", render: (c) => <span className="font-medium text-primary">{c.dorm.dName}</span> },
    { key: "location", label: "Location", render: (c) => c.location },
    { key: "beds", label: "Beds", render: (c) => c._count.beds, mobileHide: true },
    {
      key: "actions", label: "", render: (c) => (
        <button onClick={(e) => { e.stopPropagation(); setPanel({ mode: "edit", cube: c }); }}
          className="text-xs text-primary underline hover:text-accent transition-colors">Edit</button>
      ),
    },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-primary">Cubes</h1>
          <p className="text-xs text-neutral-text/50 mt-0.5">Physical sections/blocks within each dorm</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => router.push("/dashboard/dorms")} className="border border-primary/20 text-primary text-sm px-3 py-1.5 rounded-sm hover:bg-primary/5 transition-colors">← Dorms</button>
          <select value={filterDorm} onChange={(e) => setFilterDorm(e.target.value)}
            className="border border-primary/20 rounded-sm px-3 py-1.5 text-sm bg-neutral focus:outline-none focus-visible:ring-2 focus-visible:ring-accent">
            <option value="">All Dorms</option>
            {dorms.map((d) => <option key={d.dormCode} value={d.dormCode}>{d.dName}</option>)}
          </select>
          <button onClick={() => setPanel({ mode: "create" })} className="bg-accent text-primary text-sm font-semibold px-4 py-1.5 rounded-sm hover:bg-accent/90 transition-colors">+ Add Cube</button>
        </div>
      </div>

      {panel && (
        <div className="border border-primary/15 bg-primary/5 rounded-sm p-5 mb-6">
          <h2 className="text-sm font-semibold text-primary mb-4">{panel.mode === "create" ? "Add New Cube" : `Edit Cube #${panel.cube?.cubeId}`}</h2>
          <CubeForm dorms={dorms} mode={panel.mode}
            defaultValues={panel.cube ? { cubeId: panel.cube.cubeId, dormCode: panel.cube.dormCode, location: panel.cube.location } : undefined}
            onSuccess={() => { setPanel(null); load(); }}
            onCancel={() => setPanel(null)} />
        </div>
      )}

      <EntityTable columns={COLUMNS} rows={cubes} rowKey={(c) => String(c.cubeId)} loading={loading}
        emptyIcon="📦" emptyTitle="No cubes yet" emptyDescription="Add cubes after creating at least one dorm." />
    </div>
  );
}
