"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { EntityTable, type Column } from "@/components/ui/EntityTable";

interface Dorm { dormCode: string; dName: string }
interface Cube { cubeId: number; dormCode: string; location: string }
interface Bed {
  bedNo: string;
  dormCode: string;
  cubeId: number;
  bedStatus: "ok" | "needs_repair";
  isOccupied: boolean;
  dorm: { dName: string };
  cube: { location: string };
}

function BedForm({
  dorms,
  defaultValues,
  mode,
  onSuccess,
  onCancel,
}: {
  dorms: Dorm[];
  defaultValues?: Partial<Bed>;
  mode: "create" | "edit";
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [bedNo, setBedNo] = useState(defaultValues?.bedNo ?? "");
  const [dormCode, setDormCode] = useState(defaultValues?.dormCode ?? "");
  const [cubeId, setCubeId] = useState(defaultValues?.cubeId ? String(defaultValues.cubeId) : "");
  const [bedStatus, setBedStatus] = useState<"ok" | "needs_repair">(defaultValues?.bedStatus ?? "ok");
  const [cubes, setCubes] = useState<Cube[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load cubes for selected dorm
  useEffect(() => {
    if (!dormCode) { setCubes([]); setCubeId(""); return; }
    fetch(`/api/cubes?dormCode=${dormCode}`)
      .then((r) => r.json())
      .then(setCubes)
      .catch(() => {});
  }, [dormCode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!bedNo.trim() || !dormCode || !cubeId) { setError("bedNo, dorm, and cube are required"); return; }
    setSaving(true);
    try {
      const url = mode === "create" ? "/api/beds" : `/api/beds/${defaultValues?.bedNo}`;
      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bedNo: bedNo.trim(), dormCode, cubeId: Number(cubeId), bedStatus }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error"); return; }
      onSuccess();
    } catch { setError("Network error"); } finally { setSaving(false); }
  }

  const fieldCls = "w-full border border-primary/20 rounded-sm px-3 py-1.5 text-sm bg-neutral focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      {error && <div className="text-sm text-red-600 border border-red-300 bg-red-50 px-3 py-2 rounded-sm">{error}</div>}

      <div>
        <label className="block text-sm font-medium text-neutral-text mb-1">Bed Number <span className="text-accent">*</span></label>
        <input value={bedNo} onChange={(e) => { setBedNo(e.target.value); setError(null); }}
          disabled={mode === "edit"} placeholder="e.g. BED-001"
          className={`${fieldCls} ${mode === "edit" ? "opacity-40 cursor-not-allowed" : ""}`} />
        {mode === "edit" && <p className="text-xs text-neutral-text/40 mt-1">Bed number cannot be changed after creation.</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-text mb-1">Dorm <span className="text-accent">*</span></label>
        <select value={dormCode} onChange={(e) => { setDormCode(e.target.value); setCubeId(""); setError(null); }}
          disabled={mode === "edit"} className={`${fieldCls} ${mode === "edit" ? "opacity-40" : ""}`}>
          <option value="">Select dorm…</option>
          {dorms.map((d) => <option key={d.dormCode} value={d.dormCode}>{d.dName} ({d.dormCode})</option>)}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-text mb-1">Cube <span className="text-accent">*</span></label>
        <select value={cubeId} onChange={(e) => { setCubeId(e.target.value); setError(null); }}
          disabled={!dormCode} className={`${fieldCls} ${!dormCode ? "opacity-40" : ""}`}>
          <option value="">{dormCode ? "Select cube…" : "Select a dorm first"}</option>
          {cubes.map((c) => <option key={c.cubeId} value={c.cubeId}>#{c.cubeId} — {c.location}</option>)}
        </select>
        {dormCode && cubes.length === 0 && (
          <p className="text-xs text-amber-600 mt-1">No cubes in this dorm yet. Add cubes first.</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-text mb-1">Bed Status</label>
        <select value={bedStatus} onChange={(e) => setBedStatus(e.target.value as "ok" | "needs_repair")} className={fieldCls}>
          <option value="ok">OK</option>
          <option value="needs_repair">Needs Repair</option>
        </select>
      </div>

      {/* isOccupied — read-only info */}
      {mode === "edit" && (
        <div className="border border-primary/10 bg-primary/5 rounded-sm px-3 py-2 text-xs text-neutral-text/60">
          <span className="font-medium">Occupied:</span>{" "}
          {defaultValues?.isOccupied ? "Yes — managed via Bed Allocation" : "No"}
          <span className="ml-2 text-neutral-text/40">(read-only)</span>
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button type="submit" disabled={saving} className="bg-primary text-neutral text-sm font-semibold px-5 py-2 rounded-sm hover:bg-primary/90 transition-colors disabled:opacity-50">
          {saving ? "Saving…" : mode === "create" ? "Add Bed" : "Save Changes"}
        </button>
        <button type="button" onClick={onCancel} className="text-sm border border-primary/15 px-4 py-2 rounded-sm hover:bg-primary/5 transition-colors">Cancel</button>
      </div>
    </form>
  );
}

export default function BedsPage() {
  const router = useRouter();
  const [beds, setBeds] = useState<Bed[]>([]);
  const [dorms, setDorms] = useState<Dorm[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDorm, setFilterDorm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterOccupied, setFilterOccupied] = useState("");
  const [panel, setPanel] = useState<{ mode: "create" | "edit"; bed?: Bed } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterDorm) params.set("dormCode", filterDorm);
    if (filterStatus) params.set("status", filterStatus);
    if (filterOccupied) params.set("occupied", filterOccupied);
    const [bedsRes, dormsRes] = await Promise.all([
      fetch(`/api/beds?${params}`), fetch("/api/dorms"),
    ]);
    const [bedsData, dormsData] = await Promise.all([bedsRes.json(), dormsRes.json()]);
    setBeds(bedsData);
    setDorms(dormsData);
    setLoading(false);
  }, [filterDorm, filterStatus, filterOccupied]);

  useEffect(() => { load(); }, [load]);

  const COLUMNS: Column<Bed>[] = [
    { key: "bedNo", label: "Bed No.", render: (b) => <span className="font-mono text-xs font-medium">{b.bedNo}</span> },
    { key: "dorm", label: "Dorm", render: (b) => <span className="font-medium text-primary">{b.dorm.dName}</span> },
    { key: "cube", label: "Cube", render: (b) => b.cube.location, mobileHide: true },
    {
      key: "status", label: "Status", render: (b) => (
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-sm uppercase ${b.bedStatus === "needs_repair" ? "bg-amber-100 text-amber-700" : "bg-primary/10 text-primary"}`}>
          {b.bedStatus === "needs_repair" ? "Needs Repair" : "OK"}
        </span>
      ),
    },
    {
      key: "occupied", label: "Occupied", render: (b) => (
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-sm ${b.isOccupied ? "bg-neutral-text/10 text-neutral-text/70" : "bg-primary/10 text-primary"}`}>
          {b.isOccupied ? "Yes" : "Free"}
        </span>
      ),
    },
    {
      key: "actions", label: "", render: (b) => (
        <button onClick={(e) => { e.stopPropagation(); setPanel({ mode: "edit", bed: b }); }}
          className="text-xs text-primary underline hover:text-accent transition-colors">Edit</button>
      ),
    },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-primary">Beds</h1>
          <p className="text-xs text-neutral-text/50 mt-0.5">Manage beds, repair status, and view occupancy</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => router.push("/dashboard/dorms")} className="border border-primary/20 text-primary text-sm px-3 py-1.5 rounded-sm hover:bg-primary/5 transition-colors">← Dorms</button>
          <button onClick={() => router.push("/dashboard/cubes")} className="border border-primary/20 text-primary text-sm px-3 py-1.5 rounded-sm hover:bg-primary/5 transition-colors">Cubes</button>
          <button onClick={() => setPanel({ mode: "create" })} className="bg-accent text-primary text-sm font-semibold px-4 py-1.5 rounded-sm hover:bg-accent/90 transition-colors">+ Add Bed</button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <select value={filterDorm} onChange={(e) => setFilterDorm(e.target.value)}
          className="border border-primary/20 rounded-sm px-3 py-1.5 text-sm bg-neutral focus:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          <option value="">All Dorms</option>
          {dorms.map((d) => <option key={d.dormCode} value={d.dormCode}>{d.dName}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-primary/20 rounded-sm px-3 py-1.5 text-sm bg-neutral focus:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          <option value="">All Statuses</option>
          <option value="ok">OK</option>
          <option value="needs_repair">Needs Repair</option>
        </select>
        <select value={filterOccupied} onChange={(e) => setFilterOccupied(e.target.value)}
          className="border border-primary/20 rounded-sm px-3 py-1.5 text-sm bg-neutral focus:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          <option value="">All Occupancy</option>
          <option value="false">Free</option>
          <option value="true">Occupied</option>
        </select>
        <span className="self-center text-xs text-neutral-text/50 ml-auto">{beds.length} bed{beds.length !== 1 ? "s" : ""}</span>
      </div>

      {panel && (
        <div className="border border-primary/15 bg-primary/5 rounded-sm p-5 mb-6">
          <h2 className="text-sm font-semibold text-primary mb-4">{panel.mode === "create" ? "Add New Bed" : `Edit Bed ${panel.bed?.bedNo}`}</h2>
          <BedForm dorms={dorms} mode={panel.mode} defaultValues={panel.bed}
            onSuccess={() => { setPanel(null); load(); }}
            onCancel={() => setPanel(null)} />
        </div>
      )}

      <EntityTable columns={COLUMNS} rows={beds} rowKey={(b) => b.bedNo} loading={loading}
        emptyIcon="🛏️" emptyTitle="No beds yet" emptyDescription="Add beds after creating dorms and cubes." />
    </div>
  );
}
