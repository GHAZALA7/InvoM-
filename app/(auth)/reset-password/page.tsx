"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import toast from "react-hot-toast";
import { Mail, ArrowLeft } from "lucide-react";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });

    if (error) {
      toast.error(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-100 rounded-full">
          <Mail size={22} className="text-emerald-600" />
        </div>
        <h2 className="text-xl font-semibold text-slate-900">Check your email</h2>
        <p className="text-sm text-slate-500">
          We sent a password reset link to <strong>{email}</strong>
        </p>
        <Link href="/login" className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium">
          <ArrowLeft size={14} /> Back to login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleReset} className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Reset password</h2>
        <p className="text-sm text-slate-500 mt-1">We'll send you a link to reset your password</p>
      </div>

      <Input
        label="Email"
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        icon={<Mail size={16} />}
        required
      />

      <Button type="submit" loading={loading} fullWidth size="lg">
        Send reset link
      </Button>

      <Link href="/login" className="flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft size={14} /> Back to login
      </Link>
    </form>
  );
}
