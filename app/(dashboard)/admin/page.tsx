"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Store, Profile } from "@/types";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import toast from "react-hot-toast";
import { Building2, Users, ChevronDown, ChevronUp, ToggleLeft, ToggleRight, Shield } from "lucide-react";

type StoreWithProducts = Store & { product_count?: number };

export default function AdminPage() {
  const router = useRouter();
  const [stores, setStores] = useState<StoreWithProducts[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"stores" | "users">("stores");
  const [expandedStore, setExpandedStore] = useState<string | null>(null);
  const [storeProducts, setStoreProducts] = useState<Record<string, { name: string; quantity: number; sku: string }[]>>({});

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "super_admin") {
        toast.error("Access denied");
        router.push("/select-store");
        return;
      }

      const [{ data: storesData }, { data: usersData }] = await Promise.all([
        supabase.from("stores").select("*").order("name"),
        supabase.from("profiles").select("*").order("full_name"),
      ]);

      setStores(storesData || []);
      setUsers(usersData || []);
      setLoading(false);
    }
    load();
  }, [router]);

  async function toggleStore(store: Store) {
    const supabase = createClient();
    const { error } = await supabase
      .from("stores")
      .update({ is_active: !store.is_active })
      .eq("id", store.id);
    if (error) { toast.error("Failed to update"); return; }
    setStores((prev) => prev.map((s) => s.id === store.id ? { ...s, is_active: !s.is_active } : s));
    toast.success(`Store ${store.is_active ? "deactivated" : "activated"}`);
  }

  async function toggleUser(user: Profile) {
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: !user.is_active })
      .eq("id", user.id);
    if (error) { toast.error("Failed to update"); return; }
    setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, is_active: !u.is_active } : u));
    toast.success(`User ${user.is_active ? "deactivated" : "activated"}`);
  }

  async function changeRole(user: Profile, role: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", user.id);
    if (error) { toast.error("Failed to update role"); return; }
    setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, role: role as Profile["role"] } : u));
    toast.success("Role updated");
  }

  async function expandStore(storeId: string) {
    if (expandedStore === storeId) { setExpandedStore(null); return; }
    setExpandedStore(storeId);
    if (storeProducts[storeId]) return;

    const supabase = createClient();
    const { data } = await supabase
      .from("store_products")
      .select("sku, quantity, product:products(name)")
      .eq("store_id", storeId)
      .order("quantity", { ascending: true })
      .limit(10);

    setStoreProducts((prev) => ({
      ...prev,
      [storeId]: (data || []).map((d) => ({
        name: (d.product as unknown as { name: string } | null)?.name || "",
        quantity: d.quantity,
        sku: d.sku,
      })),
    }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="pt-5 pb-4 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 flex items-center justify-center bg-indigo-100 rounded-xl">
          <Shield size={18} className="text-indigo-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Super Admin</h1>
          <p className="text-xs text-slate-400">{stores.length} stores · {users.length} users</p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
        <button
          onClick={() => setTab("stores")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium min-h-0 transition-all
            ${tab === "stores" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
        >
          <Building2 size={15} /> Stores
        </button>
        <button
          onClick={() => setTab("users")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium min-h-0 transition-all
            ${tab === "users" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
        >
          <Users size={15} /> Users
        </button>
      </div>

      {/* Stores tab */}
      {tab === "stores" && (
        <div className="space-y-2">
          {stores.map((store) => (
            <Card key={store.id} padding="sm">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm text-slate-900">{store.name}</p>
                    <Badge variant={store.is_active ? "green" : "red"}>
                      {store.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  {store.address && <p className="text-xs text-slate-400 truncate mt-0.5">{store.address}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => expandStore(store.id)}
                    className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 min-h-0"
                  >
                    {expandedStore === store.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  <button
                    onClick={() => toggleStore(store)}
                    className="min-h-0"
                  >
                    {store.is_active
                      ? <ToggleRight size={28} className="text-emerald-500" />
                      : <ToggleLeft size={28} className="text-slate-300" />
                    }
                  </button>
                </div>
              </div>

              {expandedStore === store.id && (
                <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Top inventory</p>
                  {(storeProducts[store.id] || []).length === 0 ? (
                    <p className="text-xs text-slate-400">No products yet</p>
                  ) : (
                    storeProducts[store.id].map((p) => (
                      <div key={p.sku} className="flex items-center justify-between text-sm">
                        <span className="text-slate-700 truncate flex-1">{p.name}</span>
                        <span className={`font-bold ml-2 ${p.quantity === 0 ? "text-red-500" : "text-slate-900"}`}>
                          {p.quantity}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Users tab */}
      {tab === "users" && (
        <div className="space-y-2">
          {users.map((user) => (
            <Card key={user.id} padding="sm">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold text-indigo-600">
                    {user.full_name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-slate-900 truncate">{user.full_name}</p>
                  <p className="text-xs text-slate-400 truncate">{user.email}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => toggleUser(user)}
                    className="min-h-0"
                  >
                    {user.is_active
                      ? <ToggleRight size={26} className="text-emerald-500" />
                      : <ToggleLeft size={26} className="text-slate-300" />
                    }
                  </button>
                </div>
              </div>
              <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                {(["employee", "manager", "super_admin"] as const).map((role) => (
                  <button
                    key={role}
                    onClick={() => changeRole(user, role)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all min-h-0
                      ${user.role === role
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-slate-500 border-slate-200 hover:border-indigo-300"
                      }`}
                  >
                    {role === "super_admin" ? "Admin" : role.charAt(0).toUpperCase() + role.slice(1)}
                  </button>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
