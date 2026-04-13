"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { StoreProduct } from "@/types";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";
import toast from "react-hot-toast";
import { ArrowLeft, Printer, Pencil, Check, X, Barcode, PackagePlus } from "lucide-react";
import Link from "next/link";

export default function ProductDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [sp, setSp] = useState<StoreProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit form
  const [editName, setEditName] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editThreshold, setEditThreshold] = useState("");
  const [editCostPrice, setEditCostPrice] = useState("");

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("store_products")
      .select("*, product:products(*, category:categories(*), ownership_type:ownership_types(*))")
      .eq("id", id)
      .single();
    setSp(data);
    if (data) {
      setEditName(data.product?.name || "");
      setEditNotes(data.product?.notes || "");
      setEditThreshold(String(data.low_stock_threshold));
      setEditCostPrice(data.cost_price != null ? String(data.cost_price) : "");
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    if (!sp) return;
    setSaving(true);
    const supabase = createClient();

    const [, spResult] = await Promise.all([
      supabase.from("products").update({ name: editName.trim(), notes: editNotes.trim() || null }).eq("id", sp.product_id),
      supabase.from("store_products").update({
        low_stock_threshold: parseInt(editThreshold) || 5,
        cost_price: editCostPrice ? parseFloat(editCostPrice) : null,
      }).eq("id", sp.id),
    ]);

    if (spResult.error) {
      toast.error("Failed to save");
    } else {
      toast.success("Saved!");
      setEditing(false);
      load();
    }
    setSaving(false);
  }

  function handlePrint() {
    if (!sp) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>SKU - ${sp.product?.name}</title>
      <style>
        body { font-family: -apple-system, sans-serif; display: flex; flex-direction: column; align-items: center; padding: 20px; }
        h2 { font-size: 16px; margin: 8px 0 4px; text-align: center; }
        p { font-size: 12px; color: #666; margin: 2px 0; text-align: center; }
        .sku { font-family: monospace; font-size: 22px; font-weight: bold; color: #333; margin-top: 10px; letter-spacing: 2px; }
      </style></head>
      <body>
        <h2>${sp.product?.name}</h2>
        <p>${sp.product?.category?.name || ""}</p>
        <p class="sku">${sp.sku}</p>
      </body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
  }

  if (loading || !sp) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  const qty = sp.quantity;
  const low = qty <= sp.low_stock_threshold && qty > 0;
  const out = qty === 0;

  return (
    <div className="pt-5 pb-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center bg-white border border-slate-200 rounded-xl min-h-0">
          <ArrowLeft size={18} className="text-slate-600" />
        </button>
        <h1 className="text-xl font-bold text-slate-900 flex-1 truncate">
          {editing ? "Edit Product" : sp.product?.name}
        </h1>
        {!editing && (
          <button onClick={() => setEditing(true)} className="w-9 h-9 flex items-center justify-center bg-white border border-slate-200 rounded-xl min-h-0">
            <Pencil size={16} className="text-slate-600" />
          </button>
        )}
      </div>

      {/* SKU card */}
      <Card className="flex flex-col items-center gap-3 py-6">
        <Barcode size={48} className="text-slate-400" />
        <div className="text-center">
          <p className="font-mono text-xl font-bold text-slate-800 tracking-widest">{sp.sku}</p>
          <p className="text-xs text-slate-400 mt-0.5">{sp.product?.category?.name}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={handlePrint}>
          <Printer size={15} /> Print label
        </Button>
      </Card>

      {/* Stock indicator */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Current stock</p>
            <p className={`text-3xl font-bold mt-0.5 ${out ? "text-red-500" : low ? "text-amber-500" : "text-slate-900"}`}>
              {qty}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {out && <Badge variant="red">Out of stock</Badge>}
            {low && !out && <Badge variant="yellow">Low stock</Badge>}
            {!out && !low && <Badge variant="green">In stock</Badge>}
            {sp.product?.ownership_type?.name === "Cellaris" && <Badge variant="indigo">Cellaris</Badge>}
          </div>
        </div>

        {sp.cost_price != null && (
          <div className="border-t border-slate-100 pt-3 flex items-end justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Cost price / unit</p>
              <p className="text-xl font-bold text-slate-800 mt-0.5">
                ${sp.cost_price.toFixed(2)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400 font-medium">Total inventory value</p>
              <p className="text-xl font-bold text-indigo-600 mt-0.5">
                ${(qty * sp.cost_price).toFixed(2)}
              </p>
              <p className="text-xs text-slate-400">{qty} units × ${sp.cost_price.toFixed(2)}</p>
            </div>
          </div>
        )}
      </Card>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-2">
        <Link href={`/sell?spId=${sp.id}`} className="flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 font-medium text-sm py-3 rounded-2xl border border-red-100">
          <Barcode size={18} /> Sell
        </Link>
        <Link href={`/restock?spId=${sp.id}`} className="flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 font-medium text-sm py-3 rounded-2xl border border-emerald-100">
          <PackagePlus size={18} /> Restock
        </Link>
      </div>

      {/* Edit form or details */}
      {editing ? (
        <Card className="space-y-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Edit details</p>
          <Input label="Product name" value={editName} onChange={(e) => setEditName(e.target.value)} />
          <Input label="Notes" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Optional notes..." />
          <Input label="Cost price per unit" type="number" min="0" step="0.01" placeholder="0.00" value={editCostPrice} onChange={(e) => setEditCostPrice(e.target.value)} />
          <Input label="Low stock threshold" type="number" min="1" value={editThreshold} onChange={(e) => setEditThreshold(e.target.value)} />
          <div className="flex gap-2">
            <Button onClick={handleSave} loading={saving} fullWidth>
              <Check size={16} /> Save
            </Button>
            <Button variant="secondary" onClick={() => setEditing(false)} fullWidth>
              <X size={16} /> Cancel
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="space-y-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Details</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Category</span>
              <span className="font-medium text-slate-800">{sp.product?.category?.name || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Ownership</span>
              <span className="font-medium text-slate-800">{sp.product?.ownership_type?.name || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Low stock alert at</span>
              <span className="font-medium text-slate-800">{sp.low_stock_threshold} units</span>
            </div>
            {sp.product?.notes && (
              <div className="pt-1 border-t border-slate-100">
                <span className="text-slate-500 block mb-1">Notes</span>
                <span className="text-slate-700">{sp.product.notes}</span>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
