"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useStore } from "@/lib/useStore";
import { StoreProduct } from "@/types";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { AlertTriangle, ChevronRight, PackagePlus, Barcode, Search, Building2 } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const store = useStore();
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "low" | "out">("all");
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ full_name: string; role: string } | null>(null);

  const loadData = useCallback(async () => {
    if (!store) return;
    const supabase = createClient();

    const [{ data: profileData }, { data: spData }] = await Promise.all([
      supabase.from("profiles").select("full_name, role").eq("id", (await supabase.auth.getUser()).data.user?.id ?? "").single(),
      supabase
        .from("store_products")
        .select("*, product:products(*, category:categories(*), ownership_type:ownership_types(*))")
        .eq("store_id", store.id)
        .order("created_at", { ascending: false }),
    ]);

    setProfile(profileData);
    setProducts(spData || []);
    setLoading(false);
  }, [store]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const lowStockItems = products.filter((p) => p.quantity <= p.low_stock_threshold && p.quantity > 0);
  const outOfStock = products.filter((p) => p.quantity === 0);

  const filtered = products.filter((p) => {
    const matchesSearch =
      (p.product?.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.product?.category?.name || "").toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === "all" ||
      (filter === "low" && p.quantity <= p.low_stock_threshold && p.quantity > 0) ||
      (filter === "out" && p.quantity === 0);
    return matchesSearch && matchesFilter;
  });

  if (!store || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="pt-5 pb-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.push("/select-store")}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-600 mb-1 font-medium min-h-0"
          >
            <Building2 size={13} /> {store.name}
          </button>
          <h1 className="text-2xl font-bold text-slate-900">Inventory</h1>
        </div>
        <Link
          href="/products/new"
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-sm"
        >
          <PackagePlus size={16} />
          Add
        </Link>
      </div>

      {/* Alerts */}
      {(lowStockItems.length > 0 || outOfStock.length > 0) && (
        <div className="space-y-2">
          {outOfStock.length > 0 && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl p-3.5">
              <AlertTriangle size={18} className="text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700 font-medium">
                {outOfStock.length} item{outOfStock.length > 1 ? "s" : ""} out of stock
              </p>
            </div>
          )}
          {lowStockItems.length > 0 && (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-3.5">
              <AlertTriangle size={18} className="text-amber-500 flex-shrink-0" />
              <p className="text-sm text-amber-700 font-medium">
                {lowStockItems.length} item{lowStockItems.length > 1 ? "s" : ""} running low
              </p>
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`rounded-2xl p-3 text-center border transition-all ${filter === "all" ? "bg-indigo-600 border-indigo-600" : "bg-white border-slate-100 hover:border-indigo-200"}`}
        >
          <p className={`text-2xl font-bold ${filter === "all" ? "text-white" : "text-slate-900"}`}>{products.length}</p>
          <p className={`text-xs mt-0.5 ${filter === "all" ? "text-indigo-200" : "text-slate-400"}`}>Products</p>
        </button>
        <button
          onClick={() => setFilter(filter === "low" ? "all" : "low")}
          className={`rounded-2xl p-3 text-center border transition-all ${filter === "low" ? "bg-amber-500 border-amber-500" : "bg-white border-slate-100 hover:border-amber-200"}`}
        >
          <p className={`text-2xl font-bold ${filter === "low" ? "text-white" : "text-amber-500"}`}>{lowStockItems.length}</p>
          <p className={`text-xs mt-0.5 ${filter === "low" ? "text-amber-100" : "text-slate-400"}`}>Low stock</p>
        </button>
        <button
          onClick={() => setFilter(filter === "out" ? "all" : "out")}
          className={`rounded-2xl p-3 text-center border transition-all ${filter === "out" ? "bg-red-500 border-red-500" : "bg-white border-slate-100 hover:border-red-200"}`}
        >
          <p className={`text-2xl font-bold ${filter === "out" ? "text-white" : "text-red-500"}`}>{outOfStock.length}</p>
          <p className={`text-xs mt-0.5 ${filter === "out" ? "text-red-100" : "text-slate-400"}`}>Out of stock</p>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, category, or SKU..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Product list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <Card className="text-center py-8">
            <p className="text-slate-400 text-sm">No products found.</p>
            <Link href="/products/new" className="text-indigo-600 text-sm font-medium mt-2 inline-block">
              Add your first product →
            </Link>
          </Card>
        ) : (
          filtered.map((sp) => {
            const qty = sp.quantity;
            const low = qty <= sp.low_stock_threshold && qty > 0;
            const out = qty === 0;
            return (
              <Link
                key={sp.id}
                href={`/products/${sp.id}`}
                className="flex items-center gap-3 bg-white border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 rounded-2xl p-4 shadow-sm transition-all"
              >
                <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center
                  ${out ? "bg-red-100" : low ? "bg-amber-100" : "bg-emerald-100"}`}>
                  <Barcode size={18} className={out ? "text-red-500" : low ? "text-amber-500" : "text-emerald-600"} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 text-sm truncate">{sp.product?.name}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-slate-400">{sp.product?.category?.name}</span>
                    <span className="text-xs text-slate-300">·</span>
                    <span className="text-xs text-slate-400 font-mono">{sp.sku}</span>
                    {sp.product?.ownership_type?.name === "Cellaris" && (
                      <Badge variant="indigo">Cellaris</Badge>
                    )}
                  </div>
                  {sp.cost_price != null && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="text-xs text-slate-500">Cost: <span className="font-medium text-slate-700">${sp.cost_price.toFixed(2)}</span></span>
                      <span className="text-xs text-slate-300">·</span>
                      <span className="text-xs text-indigo-600 font-medium">Value: ${(qty * sp.cost_price).toFixed(2)}</span>
                    </div>
                  )}
                </div>
                <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
                  <span className={`text-lg font-bold ${out ? "text-red-500" : low ? "text-amber-500" : "text-slate-900"}`}>
                    {qty}
                  </span>
                  {out && <Badge variant="red">Out</Badge>}
                  {low && !out && <Badge variant="yellow">Low</Badge>}
                  {!out && !low && <Badge variant="green">OK</Badge>}
                </div>
                <ChevronRight size={16} className="text-slate-300" />
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
