import type { Metadata } from "next";
import Carousel, { type CarouselSlide } from "@/components/Carousel";

// Local school images — statically imported so Next.js optimises them
import img1 from "./img/img1.jpg";
import img2 from "./img/img2.jpg";
import img3 from "./img/img3.png";
import img4 from "./img/img4.webp";
import img5 from "./img/img5.jpeg";

export const metadata: Metadata = {
  title: "Kigumo Bendera Senior School — Dorm Management",
  description:
    "Web-based boarding dorm management system for Kigumo Bendera Senior School, Kenya.",
};

const SLIDES: CarouselSlide[] = [
  {
    src: img1,
    alt: "Kigumo Bendera Senior School campus — school grounds and buildings",
    caption: "Welcome to Kigumo Bendera Senior School",
  },
  {
    src: img2,
    alt: "School facilities at Kigumo Bendera Senior School",
    caption: "Our Campus",
  },
  {
    src: img3,
    alt: "Students at Kigumo Bendera Senior School",
    caption: "Student Life at Kigumo Bendera",
  },
  {
    src: img4,
    alt: "Dormitory facilities at Kigumo Bendera Senior School",
    caption: "Comfortable Boarding Facilities",
  },
  {
    src: img5,
    alt: "Kigumo Bendera Senior School — academic excellence and discipline",
    caption: "Building Tomorrow's Leaders",
  },
];

export default function HomePage() {
  return (
    <>
      {/* ── Hero carousel ─────────────────────────────────────────── */}
      <section aria-label="School photo gallery">
        <Carousel slides={SLIDES} interval={4500} />
      </section>

      {/* ── Welcome section ───────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl md:text-3xl font-bold text-primary mb-4">
          Welcome to Kigumo Bendera Senior School
        </h1>
        <p className="text-neutral-text/70 text-base leading-relaxed max-w-2xl mx-auto">
          Kigumo Bendera Senior School is a leading boarding institution in
          Kenya committed to academic excellence, discipline, and holistic
          student development. Our modern dorm management system keeps our
          boarding facilities organised and transparent.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="/login"
            className="bg-primary text-neutral font-semibold px-6 py-2.5 rounded-sm hover:bg-primary/90 transition-colors text-sm"
          >
            Staff Login →
          </a>
          <a
            href="/about"
            className="border border-primary text-primary font-semibold px-6 py-2.5 rounded-sm hover:bg-primary/5 transition-colors text-sm"
          >
            Learn More
          </a>
        </div>
      </section>

      {/* ── Feature cards ─────────────────────────────────────────── */}
      <section className="bg-primary/5 border-y border-primary/10 py-12">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-center text-lg font-bold text-primary mb-8">
            Dorm Management at a Glance
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="bg-neutral border border-primary/15 p-5 rounded-sm"
              >
                <div className="text-2xl mb-2" aria-hidden>
                  {f.icon}
                </div>
                <h3 className="font-semibold text-primary text-sm mb-1">
                  {f.title}
                </h3>
                <p className="text-neutral-text/60 text-xs leading-relaxed">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

const FEATURES = [
  {
    icon: "🛏️",
    title: "Bed Allocation",
    description:
      "Assign students to beds digitally. Full allocation history — no data ever deleted.",
  },
  {
    icon: "📊",
    title: "Reports & Export",
    description:
      "One-click reports by class or dorm. Export to Excel or print directly from the browser.",
  },
  {
    icon: "🔒",
    title: "Role-Based Access",
    description:
      "Admin and Dorm Master roles with server-side enforcement — no accidental overwrites.",
  },
  {
    icon: "📋",
    title: "Secretary & Cleaner Records",
    description:
      "Track dorm secretaries and cleaners linked directly to student records.",
  },
  {
    icon: "⬆️",
    title: "Class Promotion",
    description:
      "Bulk promote or demote students at year-end with a preview and audit trail.",
  },
  {
    icon: "📱",
    title: "Mobile Friendly",
    description:
      "Works on any device — phone, tablet, or desktop. No app install required.",
  },
];
