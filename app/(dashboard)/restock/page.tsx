"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useStore } from "@/lib/useStore";
import { StoreProduct } from "@/types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";
import toast from "react-hot-toast";
import dynamic from "next/dynamic";
import { ScanLine, Search, Plus, Check } from "lucide-react";

const QRScanner = dynamic(() => import("@/components/qr/QRScanner"), { ssr: false });

function RestockContent() {
  const store = useStore();
  const searchParams = useSearchParams();
  const preloadId = searchParams.get("spId");

  const [scanning, setScanning] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<StoreProduct[]>([]);
  const [selected, setSelected] = useState<StoreProduct | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadById = useCallback(async (spId: string) => {
    if (!store) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("store_products")
      .select("*, product:products(*, category:categories(*))")
      .eq("id", spId)
      .eq("store_id", store.id)
      .single();
    if (data) setSelected(data);
    else toast.error("Product not found in this store");
  }, [store]);

  useEffect(() => {
    if (preloadId) loadById(preloadId);
  }, [preloadId, loadById]);

  async function handleSearch(value: string) {
    setSearchText(value);
    if (!store || value.length < 2) { setSearchResults([]); return; }
    const supabase = createClient();
    const { data } = await supabase
      .from("store_products")
      .select("*, product:products(*, category:categories(*))")
      .eq("store_id", store.id)
      .or(`product.name.ilike.%${value}%,sku.ilike.%${value}%`)
      .limit(8);
    setSearchResults(data || []);
  }

  function handleQRScan(raw: string) {
    setScanning(false);
    try {
      const parsed = JSON.parse(raw);
      if (parsed.spId) loadById(parsed.spId);
      else toast.error("Invalid QR code");
    } catch {
      toast.error("Could not read QR code");
    }
  }

  async function handleRestock() {
    if (!selected || !store) return;
    const qty = parseInt(quantity);
    if (!qty || qty <= 0) { toast.error("Enter a valid quantity"); return; }

    setSubmitting(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const newQty = selected.quantity + qty;

    const { error: updateError } = await supabase
      .from("store_products")
      .update({ quantity: newQty })
      .eq("id", selected.id);

    if (updateError) { toast.error("Failed to update stock"); setSubmitting(false); return; }

    await supabase.from("transactions").insert({
      store_id: store.id,
      store_product_id: selected.id,
      user_id: user!.id,
      action: "restock",
      quantity_changed: qty,
      quantity_before: selected.quantity,
      quantity_after: newQty,
      notes: notes.trim() || null,
    });

    toast.success(`Restocked ${qty} × ${selected.product?.name}`);
    setSelected(null);
    setQuantity("1");
    setNotes("");
    setSearchText("");
    setSubmitting(false);
  }

  return (
    <div className="pt-5 pb-4 space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Restock</h1>

      {!selected ? (
        <>
          <button
            onClick={() => setScanning(true)}
            className="w-full flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-4 rounded-2xl shadow-sm"
          >
            <ScanLine size={22} />
            <span>Scan QR Code</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400 font-medium">or search manually</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchText}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by product name or SKU..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="space-y-2">
            {searchResults.map((sp) => (
              <button
                key={sp.id}
                onClick={() => { setSelected(sp); setSearchText(""); setSearchResults([]); }}
                className="w-full flex items-center gap-3 bg-white border border-slate-100 hover:border-emerald-200 rounded-2xl p-4 text-left shadow-sm"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-slate-900 truncate">{sp.product?.name}</p>
                  <p className="text-xs text-slate-400">{sp.product?.category?.name} · {sp.sku}</p>
                </div>
                <span className="text-lg font-bold text-slate-900">{sp.quantity}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <Card className="space-y-2">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900">{selected.product?.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{selected.product?.category?.name} · {selected.sku}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-slate-900">{selected.quantity}</p>
                <p className="text-xs text-slate-400">current stock</p>
              </div>
            </div>
          </Card>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Plus size={16} className="text-emerald-500" />
              <p className="font-semibold text-slate-700">Quantity to add</p>
            </div>
            <Input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="1"
            />
            <div className="bg-emerald-50 rounded-xl p-3 text-sm text-emerald-700 font-medium">
              New total: {selected.quantity + (parseInt(quantity) || 0)} units
            </div>
            <Input
              label="Notes (optional)"
              placeholder="e.g. New shipment from supplier"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => { setSelected(null); setQuantity("1"); setNotes(""); }}
              fullWidth
            >
              Cancel
            </Button>
            <Button
              onClick={handleRestock}
              loading={submitting}
              fullWidth
              className="!bg-emerald-600 hover:!bg-emerald-700"
            >
              <Check size={16} /> Confirm restock
            </Button>
          </div>
        </>
      )}

      {scanning && (
        <QRScanner onScan={handleQRScan} onClose={() => setScanning(false)} />
      )}
    </div>
  );
}

export default function RestockPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent" />
      </div>
    }>
      <RestockContent />
    </Suspense>
  );
}
