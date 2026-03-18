"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import toast from "react-hot-toast";
import { Mail, Lock } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    // Check if user is active
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_active, role")
      .eq("id", (await supabase.auth.getUser()).data.user?.id)
      .single();

    if (!profile?.is_active) {
      await supabase.auth.signOut();
      toast.error("Your account has been deactivated. Contact your manager.");
      setLoading(false);
      return;
    }

    toast.success("Welcome back!");
    router.push("/select-store");
    router.refresh();
  }

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Sign in</h2>
        <p className="text-sm text-slate-500 mt-1">Enter your credentials to continue</p>
      </div>

      <Input
        label="Email"
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        icon={<Mail size={16} />}
        required
        autoComplete="email"
      />

      <Input
        label="Password"
        type="password"
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        icon={<Lock size={16} />}
        required
        autoComplete="current-password"
      />

      <div className="flex justify-end">
        <Link href="/reset-password" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium min-h-0">
          Forgot password?
        </Link>
      </div>

      <Button type="submit" loading={loading} fullWidth size="lg">
        Sign in
      </Button>

      <p className="text-center text-sm text-slate-500">
        New store?{" "}
        <Link href="/register" className="text-indigo-600 hover:text-indigo-700 font-medium">
          Register here
        </Link>
      </p>
    </form>
  );
}
