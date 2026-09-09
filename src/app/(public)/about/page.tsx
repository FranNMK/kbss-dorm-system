import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About — Kigumo Bendera Dorms",
  description:
    "About the Kigumo Bendera Senior School dorm management system and the school.",
};

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      {/* Page heading */}
      <h1 className="text-2xl md:text-3xl font-bold text-primary mb-2">
        About Kigumo Bendera Senior School
      </h1>
      <div className="w-12 h-1 bg-accent mb-8" />

      {/* School section */}
      <section className="mb-10">
        <h2 className="text-base font-semibold text-primary mb-3">
          The School
        </h2>
        <p className="text-neutral-text/75 text-sm leading-relaxed mb-3">
          Kigumo Bendera Senior School is a boarding secondary school located
          in Kenya. The school is committed to academic excellence, discipline,
          and the holistic development of its students. It runs both the 8-4-4
          curriculum (Forms 3–4) and the Competency Based Curriculum (CBC)
          track (Grades 10–12).
        </p>
        <p className="text-neutral-text/75 text-sm leading-relaxed">
          As a full boarding institution, the school maintains several
          dormitories each managed by a dedicated Dorm Master. Student welfare,
          safe accommodation, and orderly dorm operations are central to the
          school&apos;s ethos.
        </p>
      </section>

      {/* System section */}
      <section className="mb-10">
        <h2 className="text-base font-semibold text-primary mb-3">
          About This System
        </h2>
        <p className="text-neutral-text/75 text-sm leading-relaxed mb-3">
          This web application replaces the school&apos;s legacy Microsoft
          Access dorm management database. It provides the same core
          functionality — student records, bed allocation, dorm secretaries,
          cleaners, reports, and class promotions — but runs in a browser with
          proper data integrity, audit logging, and role-based access control.
        </p>
        <p className="text-neutral-text/75 text-sm leading-relaxed">
          It is built on a modern free-tier stack (Next.js, TiDB Serverless,
          Auth0, Vercel) so there are no software licensing costs.
        </p>
      </section>

      {/* Roles section */}
      <section className="mb-10">
        <h2 className="text-base font-semibold text-primary mb-3">
          System Roles
        </h2>
        <div className="border border-primary/15 rounded-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-primary text-neutral">
              <tr>
                <th className="text-left px-4 py-2 font-semibold">Role</th>
                <th className="text-left px-4 py-2 font-semibold">Who</th>
                <th className="text-left px-4 py-2 font-semibold">Access</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-primary/10">
                <td className="px-4 py-2 font-medium text-primary">Admin</td>
                <td className="px-4 py-2 text-neutral-text/70">Deputy Principal / ICT</td>
                <td className="px-4 py-2 text-neutral-text/70">Full system access including promote/demote and user management</td>
              </tr>
              <tr className="border-t border-primary/10 bg-primary/5">
                <td className="px-4 py-2 font-medium text-primary">Dorm Master</td>
                <td className="px-4 py-2 text-neutral-text/70">Dorm Master / Assistant</td>
                <td className="px-4 py-2 text-neutral-text/70">CRUD on students, beds, allocation, secretaries, and cleaners within assigned dorms</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Version note */}
      <p className="text-xs text-neutral-text/40 border-t border-primary/10 pt-4">
        Version 1.0 — built by FK Systems Africa
      </p>
    </div>
  );
}
