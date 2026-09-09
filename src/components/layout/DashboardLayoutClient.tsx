"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface NavItem {
  href: string;
  label: string;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/students", label: "Students" },
  { href: "/dashboard/dorms", label: "Dormitories" },
  { href: "/dashboard/cubes", label: "Cubes" },
  { href: "/dashboard/beds", label: "Beds" },
  { href: "/dashboard/allocation", label: "Bed Allocation" },
  { href: "/dashboard/secretaries", label: "Dorm Secretaries" },
  { href: "/dashboard/cleaners", label: "Dorm Cleaners" },
  { href: "/dashboard/reports", label: "Reports" },
  { href: "/dashboard/admin/promote", label: "Promote Students", adminOnly: true },
  { href: "/dashboard/admin/demote", label: "Demote Students", adminOnly: true },
  { href: "/dashboard/admin/archive", label: "Archive Students", adminOnly: true },
  { href: "/dashboard/admin/users", label: "User Management", adminOnly: true },
  { href: "/dashboard/admin/audit", label: "Audit Log", adminOnly: true },
];

interface DashboardLayoutClientProps {
  children: React.ReactNode;
  userEmail: string;
  userName: string;
  userRole: string;
}

export function DashboardLayoutClient({
  children,
  userEmail,
  userName,
  userRole,
}: DashboardLayoutClientProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isAdmin = userRole === "admin";

  const visibleNav = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <div className="min-h-screen flex flex-col bg-neutral">
      {/* Top bar */}
      <header className="bg-primary text-neutral h-14 flex items-center px-4 gap-4 flex-shrink-0">
        {/* Mobile hamburger */}
        <button
          className="md:hidden p-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          onClick={() => setSidebarOpen((v) => !v)}
          aria-label="Toggle navigation"
        >
          <span className="block w-5 h-0.5 bg-neutral mb-1" />
          <span className="block w-5 h-0.5 bg-neutral mb-1" />
          <span className="block w-5 h-0.5 bg-neutral" />
        </button>

        <span className="font-bold text-base tracking-wide flex-1 truncate">
          Kigumo Bendera Dorms
        </span>

        <div className="flex items-center gap-3">
          <span className="hidden sm:block text-sm text-neutral/80 truncate max-w-[180px]">
            {userName || userEmail}
          </span>
          <span className="hidden sm:inline-block bg-accent text-primary text-xs font-semibold px-2 py-0.5 rounded-sm uppercase">
            {userRole.replace("_", " ")}
          </span>
          <button
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              window.location.href = "/login";
            }}
            className="text-sm bg-neutral/10 hover:bg-neutral/20 text-neutral px-3 py-1 rounded-sm transition-colors cursor-pointer"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar overlay on mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-primary/60 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`
            fixed md:static z-30 top-14 left-0 bottom-0 w-64
            bg-primary text-neutral flex flex-col
            transform transition-transform duration-200
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
            md:translate-x-0 md:flex
          `}
        >
          <nav className="flex-1 overflow-y-auto py-4">
            <ul className="space-y-0.5 px-2">
              {visibleNav.map((item) => {
                const isActive =
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`
                        flex items-center px-3 py-2 rounded-sm text-sm font-medium
                        transition-colors
                        ${
                          isActive
                            ? "bg-accent text-primary"
                            : "text-neutral/80 hover:bg-neutral/10 hover:text-neutral"
                        }
                      `}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>

            {isAdmin && (
              <div className="mt-4 px-4">
                <p className="text-xs font-semibold text-neutral/40 uppercase tracking-wider mb-1">
                  Admin
                </p>
              </div>
            )}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
