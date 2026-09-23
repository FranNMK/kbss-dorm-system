"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { EntityTable, type Column } from "@/components/ui/EntityTable";
import { Pagination } from "@/components/ui/Pagination";

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

// ── Single-bed form (unchanged) ───────────────────────────────────────────

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

  useEffect(() => {
    if (!dormCode) { setCubes([]); setCubeId(""); return; }
    fetch(`/api/cubes?dormCode=${dormCode}&limit=200`)
      .then((r) => r.json())
      .then((d) => setCubes(d.cubes ?? d))
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

// ── Bulk-bed form ──────────────────────────────────────────────────────────

function BulkBedForm({
  dorms,
  onSuccess,
  onCancel,
}: {
  dorms: Dorm[];
  onSuccess: (count: number) => void;
  onCancel: () => void;
}) {
  const [dormCode, setDormCode] = useState("");
  const [cubeId, setCubeId] = useState("");
  const [cubes, setCubes] = useState<Cube[]>([]);
  const [count, setCount] = useState("10");
  const [prefix, setPrefix] = useState("A");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string[]>([]);

  // Load cubes when dorm changes
  useEffect(() => {
    if (!dormCode) { setCubes([]); setCubeId(""); return; }
    fetch(`/api/cubes?dormCode=${dormCode}&limit=200`)
      .then((r) => r.json())
      .then((d) => setCubes(d.cubes ?? d))
      .catch(() => {});
  }, [dormCode]);

  // Live preview of bed numbers
  useEffect(() => {
    const n = parseInt(count);
    const p = prefix.trim().toUpperCase();
    if (!p || isNaN(n) || n < 1) { setPreview([]); return; }
    const shown = Math.min(n, 5);
    const names = Array.from({ length: shown }, (_, i) =>
      `${p}-${String(i + 1).padStart(3, "0")}`
    );
    if (n > shown) names.push(`… up to ${p}-${String(n).padStart(3, "0")}`);
    setPreview(names);
  }, [count, prefix]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = parseInt(count);
    if (!dormCode) { setError("Select a dorm"); return; }
    if (!cubeId) { setError("Select a cube"); return; }
    if (!prefix.trim()) { setError("Prefix is required"); return; }
    if (isNaN(n) || n < 1 || n > 200) { setError("Count must be between 1 and 200"); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/beds/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dormCode, cubeId: Number(cubeId), count: n, prefix: prefix.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error"); return; }
      onSuccess(data.created);
    } catch { setError("Network error"); } finally { setSaving(false); }
  }

  const fieldCls = "w-full border border-primary/20 rounded-sm px-3 py-1.5 text-sm bg-neutral focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      {error && <div className="text-sm text-red-600 border border-red-300 bg-red-50 px-3 py-2 rounded-sm">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-neutral-text mb-1">Dorm <span className="text-accent">*</span></label>
          <select value={dormCode} onChange={(e) => { setDormCode(e.target.value); setCubeId(""); setError(null); }} className={fieldCls}>
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
            <p className="text-xs text-amber-600 mt-1">No cubes in this dorm yet.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-neutral-text mb-1">
            Number of beds <span className="text-accent">*</span>
          </label>
          <input type="number" min={1} max={200} value={count}
            onChange={(e) => { setCount(e.target.value); setError(null); }} className={fieldCls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-text mb-1">
            Bed number prefix <span className="text-accent">*</span>
          </label>
          <input type="text" value={prefix} maxLength={10}
            onChange={(e) => { setPrefix(e.target.value); setError(null); }}
            placeholder="e.g. A"
            className={fieldCls} />
          <p className="text-xs text-neutral-text/40 mt-1">Beds named: PREFIX-001, PREFIX-002…</p>
        </div>
      </div>

      {/* Live preview */}
      {preview.length > 0 && (
        <div className="bg-primary/5 border border-primary/15 rounded-sm px-3 py-2">
          <p className="text-xs font-medium text-primary mb-1">Will create:</p>
          <div className="flex flex-wrap gap-1.5">
            {preview.map((name, i) => (
              <span key={i} className="text-xs bg-neutral border border-primary/15 text-primary px-2 py-0.5 rounded-sm font-mono">
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="bg-primary text-neutral text-sm font-semibold px-5 py-2 rounded-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {saving && <span className="inline-block w-3.5 h-3.5 border-2 border-neutral/30 border-t-neutral rounded-full animate-spin" />}
          {saving ? "Creating…" : `Create ${count || "N"} Beds`}
        </button>
        <button type="button" onClick={onCancel} className="text-sm border border-primary/15 px-4 py-2 rounded-sm hover:bg-primary/5 transition-colors">Cancel</button>
      </div>
    </form>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function BedsPage() {
  const router = useRouter();
  const [beds, setBeds] = useState<Bed[]>([]);
  const [dorms, setDorms] = useState<Dorm[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDorm, setFilterDorm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterOccupied, setFilterOccupied] = useState("");
  const [panel, setPanel] = useState<{ mode: "create" | "edit" | "bulk"; bed?: Bed } | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 50;

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (filterDorm) params.set("dormCode", filterDorm);
    if (filterStatus) params.set("status", filterStatus);
    if (filterOccupied) params.set("occupied", filterOccupied);
    const [bedsRes, dormsRes] = await Promise.all([
      fetch(`/api/beds?${params}`), fetch("/api/dorms?limit=200"),
    ]);
    const [bedsData, dormsData] = await Promise.all([bedsRes.json(), dormsRes.json()]);
    setBeds(bedsData.beds ?? bedsData);
    setTotal(bedsData.total ?? (bedsData.beds ?? bedsData).length);
    setDorms(dormsData.dorms ?? dormsData);
    setLoading(false);
  }, [filterDorm, filterStatus, filterOccupied, page]);

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
        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => setPanel({ mode: "edit", bed: b })}
            className="text-xs text-primary underline hover:text-accent transition-colors">Edit</button>
          <DeleteButton
            id={b.bedNo}
            endpoint={`/api/beds/${encodeURIComponent(b.bedNo)}`}
            label={b.bedNo}
            blockedIfOccupied={b.isOccupied}
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
          <h1 className="text-xl font-bold text-primary">Beds</h1>
          <p className="text-xs text-neutral-text/50 mt-0.5">Manage beds, repair status, and view occupancy</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => router.push("/dashboard/dorms")} className="border border-primary/20 text-primary text-sm px-3 py-1.5 rounded-sm hover:bg-primary/5 transition-colors">← Dorms</button>
          <button onClick={() => router.push("/dashboard/cubes")} className="border border-primary/20 text-primary text-sm px-3 py-1.5 rounded-sm hover:bg-primary/5 transition-colors">Cubes</button>
          <button
            onClick={() => { setPanel({ mode: "bulk" }); setSuccessMsg(null); }}
            className="bg-primary/10 text-primary text-sm font-semibold px-4 py-1.5 rounded-sm hover:bg-primary/20 transition-colors border border-primary/20"
          >
            ⚡ Bulk Add Beds
          </button>
          <button onClick={() => { setPanel({ mode: "create" }); setSuccessMsg(null); }} className="bg-accent text-primary text-sm font-semibold px-4 py-1.5 rounded-sm hover:bg-accent/90 transition-colors">+ Add Bed</button>
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

      {/* Success banner */}
      {successMsg && (
        <div className="border border-green-300 bg-green-50 text-green-800 text-sm px-4 py-3 rounded-sm mb-4 flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-green-600 hover:text-green-800 ml-4">✕</button>
        </div>
      )}

      {panel && (
        <div className="border border-primary/15 bg-primary/5 rounded-sm p-5 mb-6">
          <h2 className="text-sm font-semibold text-primary mb-4">
            {panel.mode === "bulk"
              ? "Bulk Add Beds"
              : panel.mode === "create"
              ? "Add New Bed"
              : `Edit Bed ${panel.bed?.bedNo}`}
          </h2>

          {panel.mode === "bulk" ? (
            <BulkBedForm
              dorms={dorms}
              onSuccess={(n) => {
                setPanel(null);
                setSuccessMsg(`✓ ${n} bed${n !== 1 ? "s" : ""} created successfully`);
                load();
              }}
              onCancel={() => setPanel(null)}
            />
          ) : (
            <BedForm
              dorms={dorms}
              mode={panel.mode}
              defaultValues={panel.bed}
              onSuccess={() => { setPanel(null); load(); }}
              onCancel={() => setPanel(null)}
            />
          )}
        </div>
      )}

      <Pagination
        page={page}
        totalPages={Math.ceil(total / LIMIT)}
        total={total}
        limit={LIMIT}
        onPage={(p) => { setPage(p); window.scrollTo(0, 0); }}
      />
      <EntityTable columns={COLUMNS} rows={beds} rowKey={(b) => b.bedNo} loading={loading}
        emptyIcon="🛏️" emptyTitle="No beds yet" emptyDescription="Add beds after creating dorms and cubes." />
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

// ── Delete button with inline confirm ─────────────────────────────────────

function DeleteButton({
  id,
  endpoint,
  label,
  blockedIfOccupied,
  onDeleted,
}: {
  id: string;
  endpoint: string;
  label: string;
  blockedIfOccupied?: boolean;
  onDeleted: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
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

  if (blockedIfOccupied) {
    return (
      <span className="text-xs text-neutral-text/30 cursor-not-allowed" title="Unassign student before deleting">
        Delete
      </span>
    );
  }

  if (!confirm) {
    return (
      <button onClick={() => setConfirm(true)}
        className="text-xs text-red-600 hover:text-red-800 transition-colors">
        Delete
      </button>
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
        <div className="absolute bottom-full right-0 mb-1 z-10 bg-red-50 border border-red-300 text-red-700 text-xs px-3 py-2 rounded-sm w-64 shadow-sm">
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
