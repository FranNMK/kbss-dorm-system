"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { EntityTable, type Column } from "@/components/ui/EntityTable";
import { Pagination } from "@/components/ui/Pagination";

interface Dorm { dormCode: string; dName: string }
interface Cube {
  cubeId: number;
  dormCode: string;
  location: string;
  dorm: { dName: string };
  _count: { beds: number };
}

// ── Single-cube form (unchanged) ──────────────────────────────────────────

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

// ── Bulk-cube form ─────────────────────────────────────────────────────────

function BulkCubeForm({
  dorms,
  onSuccess,
  onCancel,
}: {
  dorms: Dorm[];
  onSuccess: (count: number) => void;
  onCancel: () => void;
}) {
  const [dormCode, setDormCode] = useState("");
  const [count, setCount] = useState("10");
  const [locationPrefix, setLocationPrefix] = useState("Cube");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string[]>([]);

  // Build a live preview of the names that will be created
  useEffect(() => {
    const n = parseInt(count);
    const prefix = locationPrefix.trim();
    if (!prefix || isNaN(n) || n < 1) { setPreview([]); return; }
    const shown = Math.min(n, 5);
    const names = Array.from({ length: shown }, (_, i) => `${prefix} ${i + 1}`);
    if (n > shown) names.push(`… up to ${prefix} ${n}`);
    setPreview(names);
  }, [count, locationPrefix]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = parseInt(count);
    if (!dormCode) { setError("Select a dorm"); return; }
    if (!locationPrefix.trim()) { setError("Location prefix is required"); return; }
    if (isNaN(n) || n < 1 || n > 100) { setError("Count must be between 1 and 100"); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/cubes/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dormCode, count: n, locationPrefix: locationPrefix.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error"); return; }
      onSuccess(data.created);
    } catch { setError("Network error"); } finally { setSaving(false); }
  }

  const fieldCls = "w-full border border-primary/20 rounded-sm px-3 py-1.5 text-sm bg-neutral focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      {error && <div className="text-sm text-red-600 border border-red-300 bg-red-50 px-3 py-2 rounded-sm">{error}</div>}

      <div>
        <label className="block text-sm font-medium text-neutral-text mb-1">Dorm <span className="text-accent">*</span></label>
        <select value={dormCode} onChange={(e) => { setDormCode(e.target.value); setError(null); }} className={fieldCls}>
          <option value="">Select dorm…</option>
          {dorms.map((d) => <option key={d.dormCode} value={d.dormCode}>{d.dName} ({d.dormCode})</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-neutral-text mb-1">
            Number of cubes <span className="text-accent">*</span>
          </label>
          <input
            type="number"
            min={1}
            max={100}
            value={count}
            onChange={(e) => { setCount(e.target.value); setError(null); }}
            className={fieldCls}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-text mb-1">
            Location prefix <span className="text-accent">*</span>
          </label>
          <input
            type="text"
            value={locationPrefix}
            onChange={(e) => { setLocationPrefix(e.target.value); setError(null); }}
            placeholder="e.g. Cube or Block A"
            className={fieldCls}
          />
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
          {saving ? "Creating…" : `Create ${count || "N"} Cubes`}
        </button>
        <button type="button" onClick={onCancel} className="text-sm border border-primary/15 px-4 py-2 rounded-sm hover:bg-primary/5 transition-colors">Cancel</button>
      </div>
    </form>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function CubesPage() {
  const router = useRouter();
  const [cubes, setCubes] = useState<Cube[]>([]);
  const [dorms, setDorms] = useState<Dorm[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDorm, setFilterDorm] = useState("");
  const [panel, setPanel] = useState<{ mode: "create" | "edit" | "bulk"; cube?: Cube } | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 50;

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (filterDorm) params.set("dormCode", filterDorm);
    const [cubesRes, dormsRes] = await Promise.all([
      fetch(`/api/cubes?${params}`),
      fetch("/api/dorms?limit=200"),
    ]);
    const [cubesData, dormsData] = await Promise.all([cubesRes.json(), dormsRes.json()]);
    setCubes(cubesData.cubes ?? cubesData);
    setTotal(cubesData.total ?? (cubesData.cubes ?? cubesData).length);
    setDorms(dormsData.dorms ?? dormsData);
    setLoading(false);
  }, [filterDorm, page]);

  useEffect(() => { load(); }, [load]);

  const COLUMNS: Column<Cube>[] = [
    { key: "cubeId", label: "ID", render: (c) => <span className="font-mono text-xs">#{c.cubeId}</span>, mobileHide: true },
    { key: "dorm", label: "Dorm", render: (c) => <span className="font-medium text-primary">{c.dorm.dName}</span> },
    { key: "location", label: "Location", render: (c) => c.location },
    { key: "beds", label: "Beds", render: (c) => c._count.beds, mobileHide: true },
    {
      key: "actions", label: "", render: (c) => (
        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => setPanel({ mode: "edit", cube: c })}
            className="text-xs text-primary underline hover:text-accent transition-colors">Edit</button>
          <DeleteButton
            endpoint={`/api/cubes/${c.cubeId}`}
            label={`Cube #${c.cubeId}`}
            bedCount={c._count.beds}
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
          <button
            onClick={() => { setPanel({ mode: "bulk" }); setSuccessMsg(null); }}
            className="bg-primary/10 text-primary text-sm font-semibold px-4 py-1.5 rounded-sm hover:bg-primary/20 transition-colors border border-primary/20"
          >
            ⚡ Bulk Add Cubes
          </button>
          <button onClick={() => { setPanel({ mode: "create" }); setSuccessMsg(null); }} className="bg-accent text-primary text-sm font-semibold px-4 py-1.5 rounded-sm hover:bg-accent/90 transition-colors">+ Add Cube</button>
        </div>
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
              ? "Bulk Add Cubes"
              : panel.mode === "create"
              ? "Add New Cube"
              : `Edit Cube #${panel.cube?.cubeId}`}
          </h2>

          {panel.mode === "bulk" ? (
            <BulkCubeForm
              dorms={dorms}
              onSuccess={(n) => {
                setPanel(null);
                setSuccessMsg(`✓ ${n} cube${n !== 1 ? "s" : ""} created successfully`);
                load();
              }}
              onCancel={() => setPanel(null)}
            />
          ) : (
            <CubeForm
              dorms={dorms}
              mode={panel.mode}
              defaultValues={panel.cube ? { cubeId: panel.cube.cubeId, dormCode: panel.cube.dormCode, location: panel.cube.location } : undefined}
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
      <EntityTable columns={COLUMNS} rows={cubes} rowKey={(c) => String(c.cubeId)} loading={loading}
        emptyIcon="📦" emptyTitle="No cubes yet" emptyDescription="Add cubes after creating at least one dorm." />
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
  endpoint,
  label,
  bedCount,
  onDeleted,
}: {
  endpoint: string;
  label: string;
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

  if (bedCount && bedCount > 0) {
    return (
      <span className="text-xs text-neutral-text/30 cursor-not-allowed"
        title={`Delete the ${bedCount} bed${bedCount !== 1 ? "s" : ""} in this cube first`}>
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
