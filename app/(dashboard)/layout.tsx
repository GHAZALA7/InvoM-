import BottomNav from "@/components/ui/BottomNav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <main className="max-w-lg mx-auto px-4">{children}</main>
      <BottomNav />
    </div>
  );
}
