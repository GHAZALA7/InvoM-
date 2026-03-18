"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import toast from "react-hot-toast";
import { Mail, Lock, User } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    confirm_password: "",
  });

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirm_password) {
      toast.error("Passwords do not match");
      return;
    }
    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.full_name, role: "employee" },
      },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    toast.success("Account created! You can now sign in.");
    router.push("/login");
  }

  return (
    <form onSubmit={handleRegister} className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Create account</h2>
        <p className="text-sm text-slate-500 mt-1">Sign up to access your store's inventory</p>
      </div>

      <Input
        label="Full name"
        placeholder="Jane Smith"
        value={form.full_name}
        onChange={(e) => update("full_name", e.target.value)}
        icon={<User size={16} />}
        required
      />
      <Input
        label="Email"
        type="email"
        placeholder="you@example.com"
        value={form.email}
        onChange={(e) => update("email", e.target.value)}
        icon={<Mail size={16} />}
        required
      />
      <Input
        label="Password"
        type="password"
        placeholder="Min. 8 characters"
        value={form.password}
        onChange={(e) => update("password", e.target.value)}
        icon={<Lock size={16} />}
        required
      />
      <Input
        label="Confirm password"
        type="password"
        placeholder="••••••••"
        value={form.confirm_password}
        onChange={(e) => update("confirm_password", e.target.value)}
        icon={<Lock size={16} />}
        required
      />

      <Button type="submit" loading={loading} fullWidth size="lg">
        Create account
      </Button>

      <p className="text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
          Sign in
        </Link>
      </p>
    </form>
  );
}
