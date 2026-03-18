"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Store } from "@/types";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import toast from "react-hot-toast";
import { Building2, ChevronRight, LogOut, Shield } from "lucide-react";

export default function SelectStorePage() {
  const router = useRouter();
  const [stores, setStores] = useState<Store[]>([]);
  const [profile, setProfile] = useState<{ full_name: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: profileData }, { data: storesData }] = await Promise.all([
        supabase.from("profiles").select("full_name, role").eq("id", user.id).single(),
        supabase.from("stores").select("*").eq("is_active", true).order("name"),
      ]);

      setProfile(profileData);
      setStores(storesData || []);
      setLoading(false);
    }
    load();
  }, []);

  async function selectStore(store: Store) {
    sessionStorage.setItem("selected_store", JSON.stringify(store));
    router.push("/dashboard");
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-slate-50 p-4">
      <div className="max-w-md mx-auto pt-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-600 rounded-2xl mb-3 shadow-lg">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-900">
              Hi, {profile?.full_name?.split(" ")[0]} 👋
            </h1>
            <p className="text-slate-500 text-sm">Which store are you working at today?</p>
          </div>
          <div className="flex flex-col gap-2 items-end">
            {profile?.role === "super_admin" && (
              <button
                onClick={() => router.push("/admin")}
                className="flex items-center gap-1.5 text-xs text-indigo-600 font-medium bg-indigo-50 px-3 py-1.5 rounded-full hover:bg-indigo-100 min-h-0"
              >
                <Shield size={13} /> Admin
              </button>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs text-slate-500 font-medium bg-slate-100 px-3 py-1.5 rounded-full hover:bg-slate-200 min-h-0"
            >
              <LogOut size={13} /> Sign out
            </button>
          </div>
        </div>

        {/* Store list */}
        <div className="space-y-2">
          {stores.length === 0 ? (
            <Card>
              <p className="text-center text-slate-500 text-sm py-4">No active stores found.</p>
            </Card>
          ) : (
            stores.map((store) => (
              <button
                key={store.id}
                onClick={() => selectStore(store)}
                className="w-full bg-white hover:bg-indigo-50 border border-slate-100 hover:border-indigo-200 rounded-2xl p-4 flex items-center gap-3 text-left shadow-sm transition-all"
              >
                <div className="flex-shrink-0 w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <Building2 size={20} className="text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 text-sm">{store.name}</p>
                  {store.address && (
                    <p className="text-xs text-slate-400 truncate mt-0.5">{store.address}</p>
                  )}
                </div>
                <ChevronRight size={18} className="text-slate-300 flex-shrink-0" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
