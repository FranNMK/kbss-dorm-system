import type { Metadata } from "next";
import Carousel, { type CarouselSlide } from "@/components/Carousel";

export const metadata: Metadata = {
  title: "Kigumo Bendera Senior School — Dorm Management",
  description:
    "Web-based boarding dorm management system for Kigumo Bendera Senior School, Kenya.",
};

// 6 royalty-free Unsplash images — school will replace with actual photos.
// Each photo is education/campus themed. Alt text describes the scene.
const SLIDES: CarouselSlide[] = [
  {
    src: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1400&q=80",
    alt: "Students in a classroom with rows of desks and large windows",
    caption: "Excellence in Education",
  },
  {
    src: "https://images.unsplash.com/photo-1562774053-701939374585?w=1400&q=80",
    alt: "School campus buildings surrounded by green trees under a blue sky",
    caption: "Our Campus",
  },
  {
    src: "https://images.unsplash.com/photo-1607237138185-eedd9c632b0b?w=1400&q=80",
    alt: "Students in school uniform walking along a campus pathway",
    caption: "Student Life at Kigumo Bendera",
  },
  {
    src: "https://images.unsplash.com/photo-1555431189-0fabf2667795?w=1400&q=80",
    alt: "Rows of neatly made dormitory beds in a school boarding facility",
    caption: "Comfortable Boarding Facilities",
  },
  {
    src: "https://images.unsplash.com/photo-1571260899304-425eee4c7efc?w=1400&q=80",
    alt: "Students studying together at a library table with open books",
    caption: "A Culture of Learning",
  },
  {
    src: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1400&q=80",
    alt: "University building exterior with stairs and students walking in",
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
            href="/auth/login"
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
