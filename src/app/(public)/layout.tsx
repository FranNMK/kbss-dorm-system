import PublicNav from "@/components/public/PublicNav";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-neutral">
      <PublicNav />
      <div className="flex-1">{children}</div>
      <footer className="bg-primary text-neutral/60 text-xs text-center py-4 px-4">
        &copy; {new Date().getFullYear()} Kigumo Bendera Senior School — Dorm
        Management System
      </footer>
    </div>
  );
}
