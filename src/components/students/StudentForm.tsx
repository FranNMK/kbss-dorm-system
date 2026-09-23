"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface AcademicYear {
  yearId: number;
  label: string;
  isCurrent: boolean;
}

interface StudentFormData {
  stAdmNo: string;
  stName: string;
  cClass: string;
  stream: string;
  assessmentNo: string;
  yearId: number | "";
}

interface StudentFormProps {
  /** Pass existing student data for edit mode; omit for create mode */
  defaultValues?: Partial<StudentFormData> & { stAdmNo?: string };
  mode: "create" | "edit";
}

const CBC_CLASSES = new Set(["G10", "G11", "G12"]);
// G10 assessment number is optional; G11 and G12 require it
const ASSESSMENT_REQUIRED_CLASSES = new Set(["G11", "G12"]);

const STREAM_OPTIONS: Record<string, string[]> = {
  F3: ["S", "N", "L", "B", "V"],
  F4: ["S", "N", "L", "B", "V"],
  G10: ["M", "B", "N", "S", "L"],
  G11: ["M", "B", "N", "S", "L"],
  G12: ["M", "B", "N", "S", "L"],
};

export default function StudentForm({ defaultValues, mode }: StudentFormProps) {
  const router = useRouter();

  const [form, setForm] = useState<StudentFormData>({
    stAdmNo: defaultValues?.stAdmNo ?? "",
    stName: defaultValues?.stName ?? "",
    cClass: defaultValues?.cClass ?? "",
    stream: defaultValues?.stream ?? "",
    assessmentNo: defaultValues?.assessmentNo ?? "",
    yearId: defaultValues?.yearId ?? "",
  });

  const [years, setYears] = useState<AcademicYear[]>([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof StudentFormData, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  // Fetch academic years
  useEffect(() => {
    fetch("/api/academic-years")
      .then((r) => r.json())
      .then((data: AcademicYear[]) => {
        setYears(data);
        // Auto-select the current year for new students
        if (mode === "create" && !form.yearId) {
          const current = data.find((y) => y.isCurrent);
          if (current) setForm((f) => ({ ...f, yearId: current.yearId }));
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const streamOptions = form.cClass ? (STREAM_OPTIONS[form.cClass] ?? []) : [];
  const isCBC = CBC_CLASSES.has(form.cClass);

  function set<K extends keyof StudentFormData>(key: K, value: StudentFormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
    setServerError(null);
  }

  function validate(): boolean {
    const e: Partial<Record<keyof StudentFormData, string>> = {};
    if (!form.stAdmNo.trim()) e.stAdmNo = "Admission number is required";
    if (!form.stName.trim()) e.stName = "Full name is required";
    if (!form.cClass) e.cClass = "Class is required";
    if (!form.stream) e.stream = "Stream is required";
    if (!form.yearId) e.yearId = "Academic year is required";
    if (ASSESSMENT_REQUIRED_CLASSES.has(form.cClass) && !form.assessmentNo.trim())
      e.assessmentNo = "Assessment number is required for G11 and G12";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setServerError(null);

    try {
      const url =
        mode === "create"
          ? "/api/students"
          : `/api/students/${encodeURIComponent(defaultValues!.stAdmNo!)}`;

      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stAdmNo: form.stAdmNo.trim(),
          stName: form.stName.trim(),
          cClass: form.cClass,
          stream: form.stream,
          assessmentNo: isCBC ? form.assessmentNo.trim() || null : null,
          yearId: Number(form.yearId),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setServerError(data.error ?? "Something went wrong");
        return;
      }

      router.push("/dashboard/students");
      router.refresh();
    } catch {
      setServerError("Network error — please try again");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="max-w-lg space-y-5">
      {/* Server error */}
      {serverError && (
        <div className="border border-red-300 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-sm">
          {serverError}
        </div>
      )}

      {/* Admission Number */}
      <Field label="Admission Number" error={errors.stAdmNo} required>
        <input
          type="text"
          value={form.stAdmNo}
          onChange={(e) => set("stAdmNo", e.target.value)}
          disabled={mode === "edit"} // PK — cannot change after creation
          placeholder="e.g. KBS/2024/001"
          className={inputClass(!!errors.stAdmNo, mode === "edit")}
        />
        {mode === "edit" && (
          <p className="text-xs text-neutral-text/40 mt-1">
            Admission number cannot be changed after creation.
          </p>
        )}
      </Field>

      {/* Full Name */}
      <Field label="Full Name" error={errors.stName} required>
        <input
          type="text"
          value={form.stName}
          onChange={(e) => set("stName", e.target.value)}
          placeholder="e.g. John Kamau Mwangi"
          className={inputClass(!!errors.stName)}
        />
      </Field>

      {/* Class */}
      <Field label="Class" error={errors.cClass} required>
        <select
          value={form.cClass}
          onChange={(e) => { set("cClass", e.target.value); set("stream", ""); }}
          className={inputClass(!!errors.cClass)}
        >
          <option value="">Select class…</option>
          <optgroup label="8-4-4 Curriculum">
            {["F3", "F4"].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </optgroup>
          <optgroup label="CBC Curriculum">
            {["G10", "G11", "G12"].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </optgroup>
        </select>
      </Field>

      {/* Assessment Number — CBC only (required for G11/G12, optional for G10) */}
      {isCBC && (
        <Field
          label="Assessment Number"
          error={errors.assessmentNo}
          required={ASSESSMENT_REQUIRED_CLASSES.has(form.cClass)}
        >
          <input
            type="text"
            value={form.assessmentNo}
            onChange={(e) => set("assessmentNo", e.target.value)}
            placeholder="e.g. A000719431"
            className={inputClass(!!errors.assessmentNo)}
          />
          <p className="text-xs text-neutral-text/40 mt-1">
            {ASSESSMENT_REQUIRED_CLASSES.has(form.cClass)
              ? "Required for Grade 11 and 12 students."
              : "Optional for Grade 10 students."}
          </p>
        </Field>
      )}

      {/* Stream */}
      <Field label="Stream" error={errors.stream} required>
        <select
          value={form.stream}
          onChange={(e) => set("stream", e.target.value)}
          disabled={!form.cClass}
          className={inputClass(!!errors.stream, !form.cClass)}
        >
          <option value="">
            {form.cClass ? "Select stream…" : "Select a class first"}
          </option>
          {streamOptions.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </Field>

      {/* Academic Year */}
      <Field label="Academic Year" error={errors.yearId} required>
        <select
          value={form.yearId}
          onChange={(e) => set("yearId", Number(e.target.value) || "")}
          className={inputClass(!!errors.yearId)}
        >
          <option value="">Select year…</option>
          {years.map((y) => (
            <option key={y.yearId} value={y.yearId}>
              {y.label}{y.isCurrent ? " (current)" : ""}
            </option>
          ))}
        </select>
        {years.length === 0 && (
          <p className="text-xs text-amber-600 mt-1">
            No academic years found. Ask an Admin to create one first.
          </p>
        )}
      </Field>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="bg-primary text-neutral text-sm font-semibold px-5 py-2 rounded-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving ? "Saving…" : mode === "create" ? "Add Student" : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-neutral-text/60 px-4 py-2 rounded-sm hover:bg-primary/5 transition-colors border border-primary/15"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Helper sub-components ──────────────────────────────────────────────────

function Field({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-neutral-text mb-1">
        {label}
        {required && <span className="text-accent ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

function inputClass(hasError: boolean, disabled = false) {
  return [
    "w-full border rounded-sm px-3 py-1.5 text-sm text-neutral-text bg-neutral",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
    hasError ? "border-red-400" : "border-primary/20",
    disabled ? "opacity-40 cursor-not-allowed" : "",
  ]
    .filter(Boolean)
    .join(" ");
}
