"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import logo from "@/app/(public)/img/Logo.jpeg";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact / Support" },
];

export default function PublicNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="bg-primary text-neutral">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">

        {/* Logo + school name */}
        <Link
          href="/"
          className="flex items-center gap-2.5 hover:opacity-90 transition-opacity"
        >
          <Image
            src={logo}
            alt="Kigumo Bendera Senior School crest"
            width={38}
            height={38}
            className="rounded-full object-cover flex-shrink-0"
            priority
          />
          <span className="font-bold text-sm md:text-base tracking-wide leading-tight">
            Kigumo Bendera<br className="hidden sm:block" />
            <span className="text-accent text-xs font-medium md:text-sm"> Dorms</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 text-sm font-medium rounded-sm transition-colors ${
                  isActive
                    ? "text-accent border-b-2 border-accent"
                    : "text-neutral/80 hover:text-neutral"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <a
            href="/auth/login"
            className="ml-3 bg-accent text-primary text-sm font-semibold px-4 py-1.5 rounded-sm hover:bg-accent/90 transition-colors"
          >
            Login
          </a>
        </nav>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? (
            <span className="block text-xl leading-none text-neutral">✕</span>
          ) : (
            <span className="flex flex-col gap-1">
              <span className="block w-5 h-0.5 bg-neutral" />
              <span className="block w-5 h-0.5 bg-neutral" />
              <span className="block w-5 h-0.5 bg-neutral" />
            </span>
          )}
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="md:hidden bg-primary border-t border-neutral/10 px-4 py-3 flex flex-col gap-1">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`px-3 py-2 text-sm font-medium rounded-sm transition-colors ${
                  isActive
                    ? "text-accent bg-neutral/10"
                    : "text-neutral/80 hover:text-neutral hover:bg-neutral/10"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <a
            href="/auth/login"
            className="mt-2 bg-accent text-primary text-sm font-semibold px-4 py-2 rounded-sm text-center hover:bg-accent/90 transition-colors"
          >
            Login
          </a>
        </div>
      )}
    </header>
  );
}
