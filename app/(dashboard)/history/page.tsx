"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useStore } from "@/lib/useStore";
import { Transaction } from "@/types";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import toast from "react-hot-toast";
import { RotateCcw, TrendingDown, TrendingUp, Pencil, ChevronDown } from "lucide-react";

const ACTION_LABELS = {
  sale: { label: "Sale", badge: "red" as const, icon: TrendingDown },
  restock: { label: "Restock", badge: "green" as const, icon: TrendingUp },
  correction: { label: "Correction", badge: "blue" as const, icon: Pencil },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function HistoryPage() {
  const store = useStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [undoTarget, setUndoTarget] = useState<Transaction | null>(null);
  const [undoing, setUndoing] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 20;

  const load = useCallback(async (reset = false) => {
    if (!store) return;
    setLoading(true);
    const supabase = createClient();
    const from = reset ? 0 : page * PAGE_SIZE;

    const { data } = await supabase
      .from("transactions")
      .select(`
        *,
        profile:profiles(full_name),
        store_product:store_products(
          sku,
          product:products(name, category:categories(name))
        )
      `)
      .eq("store_id", store.id)
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    const rows = data || [];
    if (reset) {
      setTransactions(rows);
      setPage(1);
    } else {
      setTransactions((prev) => [...prev, ...rows]);
      setPage((p) => p + 1);
    }
    setHasMore(rows.length === PAGE_SIZE);
    setLoading(false);
  }, [store, page]);

  useEffect(() => { load(true); }, [store]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleUndo(tx: Transaction) {
    setUndoing(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Reverse the quantity
    const reverseDelta = -tx.quantity_changed;
    const currentSP = await supabase
      .from("store_products")
      .select("quantity")
      .eq("id", tx.store_product_id)
      .single();

    const currentQty = currentSP.data?.quantity ?? 0;
    const newQty = currentQty + reverseDelta;

    if (newQty < 0) {
      toast.error("Cannot undo — would result in negative stock");
      setUndoing(false);
      setUndoTarget(null);
      return;
    }

    await supabase.from("store_products").update({ quantity: newQty }).eq("id", tx.store_product_id);
    await supabase.from("transactions").insert({
      store_id: tx.store_id,
      store_product_id: tx.store_product_id,
      user_id: user!.id,
      action: "correction",
      quantity_changed: reverseDelta,
      quantity_before: currentQty,
      quantity_after: newQty,
      notes: `Undo of ${tx.action} (original transaction ${tx.id.slice(0, 8)})`,
    });

    toast.success("Transaction reversed");
    setUndoTarget(null);
    setUndoing(false);
    load(true);
  }

  return (
    <div className="pt-5 pb-4 space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">History</h1>

      {transactions.length === 0 && !loading ? (
        <Card className="text-center py-8">
          <p className="text-slate-400 text-sm">No transactions yet.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {transactions.map((tx) => {
            const meta = ACTION_LABELS[tx.action];
            const Icon = meta.icon;
            const isPositive = tx.quantity_changed > 0;

            return (
              <Card key={tx.id} padding="sm" className="space-y-2">
                <div className="flex items-start gap-3">
                  <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center
                    ${tx.action === "sale" ? "bg-red-100" : tx.action === "restock" ? "bg-emerald-100" : "bg-blue-100"}`}>
                    <Icon size={16} className={
                      tx.action === "sale" ? "text-red-500" :
                      tx.action === "restock" ? "text-emerald-500" : "text-blue-500"
                    } />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-slate-900 truncate">
                        {tx.store_product?.product?.name}
                      </p>
                      <Badge variant={meta.badge}>{meta.label}</Badge>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {tx.profile?.full_name} · {timeAgo(tx.created_at)}
                    </p>
                    {tx.notes && (
                      <p className="text-xs text-slate-500 mt-1 italic">"{tx.notes}"</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-lg font-bold ${isPositive ? "text-emerald-500" : "text-red-500"}`}>
                      {isPositive ? "+" : ""}{tx.quantity_changed}
                    </p>
                    <p className="text-xs text-slate-400">→ {tx.quantity_after}</p>
                  </div>
                </div>

                {/* Undo button — only for sale/restock, not already-corrections */}
                {tx.action !== "correction" && (
                  <div className="flex justify-end">
                    {undoTarget?.id === tx.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">Confirm undo?</span>
                        <Button size="sm" variant="danger" loading={undoing} onClick={() => handleUndo(tx)}>
                          Yes, undo
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setUndoTarget(null)}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setUndoTarget(tx)}
                        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-600 font-medium min-h-0 py-1"
                      >
                        <RotateCcw size={12} /> Undo
                      </button>
                    )}
                  </div>
                )}
              </Card>
            );
          })}

          {hasMore && (
            <Button variant="secondary" fullWidth onClick={() => load(false)} loading={loading}>
              <ChevronDown size={16} /> Load more
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
