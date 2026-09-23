import { getSession } from "@/lib/session";
import { getSessionRole } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import Link from "next/link";

interface MenuCard {
  href: string;
  title: string;
  description: string;
  adminOnly?: boolean;
  icon: string;
}

const MENU_CARDS: MenuCard[] = [
  // Data Entry / Search
  {
    href: "/dashboard/students",
    title: "Students",
    description: "Add, edit, and search student records",
    icon: "👤",
  },
  {
    href: "/dashboard/dorms",
    title: "Dormitories",
    description: "Manage dorm buildings and patrons",
    icon: "🏠",
  },
  {
    href: "/dashboard/cubes",
    title: "Cubes",
    description: "Manage cube sections within dorms",
    icon: "📦",
  },
  {
    href: "/dashboard/beds",
    title: "Beds",
    description: "Manage individual beds and repair status",
    icon: "🛏️",
  },
  {
    href: "/dashboard/allocation",
    title: "Bed Allocation",
    description: "Assign and un-assign students to beds",
    icon: "🔑",
  },
  {
    href: "/dashboard/secretaries",
    title: "Dorm Secretaries",
    description: "Assign dorm secretary roles to students",
    icon: "📋",
  },
  {
    href: "/dashboard/cleaners",
    title: "Dorm Cleaners",
    description: "Assign dorm cleaner roles to students",
    icon: "🧹",
  },
  // Reports
  {
    href: "/dashboard/reports",
    title: "Reports",
    description: "View, print, and export all dorm reports",
    icon: "📊",
  },
  // Admin-only
  {
    href: "/dashboard/admin/academic-years",
    title: "Academic Years",
    description: "Add, rename, and set the current academic year",
    adminOnly: true,
    icon: "📅",
  },
  {
    href: "/dashboard/admin/promote",
    title: "Promote Students",
    description: "Bulk-advance students to the next class",
    adminOnly: true,
    icon: "⬆️",
  },
  {
    href: "/dashboard/admin/demote",
    title: "Demote Students",
    description: "Bulk-reverse students to a previous class",
    adminOnly: true,
    icon: "⬇️",
  },
  {
    href: "/dashboard/admin/archive",
    title: "Archive Students",
    description: "Soft-remove students from active lists",
    adminOnly: true,
    icon: "📁",
  },
  {
    href: "/dashboard/admin/users",
    title: "User Management",
    description: "Manage staff accounts and role assignments",
    adminOnly: true,
    icon: "👥",
  },
  {
    href: "/dashboard/admin/audit",
    title: "Audit Log",
    description: "View history of all admin actions",
    adminOnly: true,
    icon: "📜",
  },
];

export default async function DashboardPage() {
  const session = await getSession();
  const role = await getSessionRole();
  const isAdmin = role === UserRole.admin;
  const userName = session?.name ?? session?.email ?? "Staff";

  const cards = MENU_CARDS.filter((c) => !c.adminOnly || isAdmin);

  const dataCards = cards.filter(
    (c) =>
      !["/dashboard/reports", "/dashboard/admin/promote", "/dashboard/admin/demote",
        "/dashboard/admin/archive", "/dashboard/admin/users", "/dashboard/admin/audit"]
        .includes(c.href)
  );
  const reportCards = cards.filter((c) => c.href === "/dashboard/reports");
  const adminCards = cards.filter((c) => c.href.startsWith("/dashboard/admin"));

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">
          Welcome, {userName}
        </h1>
        <p className="text-neutral-text/70 mt-1 text-sm">
          Kigumo Bendera Senior School — Dorm Management System
        </p>
      </div>

      {/* Data Entry / Search */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold text-neutral-text/50 uppercase tracking-wider mb-3">
          Data Entry &amp; Search
        </h2>
        <MenuGrid cards={dataCards} />
      </section>

      {/* Reports */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold text-neutral-text/50 uppercase tracking-wider mb-3">
          Reports &amp; Export
        </h2>
        <MenuGrid cards={reportCards} />
      </section>

      {/* Admin */}
      {isAdmin && adminCards.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs font-semibold text-neutral-text/50 uppercase tracking-wider mb-3">
            Admin Actions
          </h2>
          <MenuGrid cards={adminCards} />
        </section>
      )}
    </div>
  );
}

function MenuGrid({ cards }: { cards: MenuCard[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {cards.map((card) => (
        <Link
          key={card.href}
          href={card.href}
          className="block border border-primary/20 bg-neutral p-4 rounded-sm hover:border-accent hover:bg-accent/5 transition-colors group"
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl leading-none mt-0.5" aria-hidden>
              {card.icon}
            </span>
            <div>
              <p className="font-semibold text-primary group-hover:text-primary text-sm">
                {card.title}
              </p>
              <p className="text-xs text-neutral-text/60 mt-0.5">
                {card.description}
              </p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
