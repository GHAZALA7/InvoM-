interface BadgeProps {
  children: React.ReactNode;
  variant?: "green" | "red" | "yellow" | "blue" | "gray" | "indigo";
}

const variants = {
  green: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  red: "bg-red-50 text-red-700 ring-1 ring-red-200",
  yellow: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  blue: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  gray: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
  indigo: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200",
};

export default function Badge({ children, variant = "gray" }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
}
