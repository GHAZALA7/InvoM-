"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useStore } from "@/lib/useStore";
import { generateSKU } from "@/lib/generateSKU";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import toast from "react-hot-toast";
import { ArrowLeft, Tag } from "lucide-react";

interface CategorySuggestion { id: string; name: string }
interface OwnershipType { id: string; name: string }

export default function NewProductPage() {
  const router = useRouter();
  const store = useStore();
  const [loading, setLoading] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [categoryInput, setCategoryInput] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [ownershipTypeId, setOwnershipTypeId] = useState("");
  const [quantity, setQuantity] = useState("0");
  const [costPrice, setCostPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [lowStockThreshold, setLowStockThreshold] = useState("5");

  // Autocomplete
  const [suggestions, setSuggestions] = useState<CategorySuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [ownershipTypes, setOwnershipTypes] = useState<OwnershipType[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function loadOwnershipTypes() {
      const supabase = createClient();
      const { data } = await supabase.from("ownership_types").select("*").order("name");
      setOwnershipTypes(data || []);
      if (data && data.length > 0) setOwnershipTypeId(data[0].id);
    }
    loadOwnershipTypes();
  }, []);

  function handleCategoryInput(value: string) {
    setCategoryInput(value);
    setCategoryId(null); // reset selection when typing
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("categories")
        .select("id, name")
        .ilike("name", `%${value}%`)
        .limit(6);
      setSuggestions(data || []);
      setShowSuggestions(true);
    }, 250);
  }

  function selectCategory(cat: CategorySuggestion) {
    setCategoryInput(cat.name);
    setCategoryId(cat.id);
    setShowSuggestions(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!store) return;
    if (!categoryInput.trim()) {
      toast.error("Please enter a category");
      return;
    }
    if (!quantity || parseInt(quantity) < 0) {
      toast.error("Please enter a valid quantity");
      return;
    }
    if (!costPrice || parseFloat(costPrice) <= 0) {
      toast.error("Please enter a cost price");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      // 1. Get or create category
      let finalCategoryId = categoryId;
      if (!finalCategoryId) {
        const { data: existing } = await supabase
          .from("categories")
          .select("id")
          .ilike("name", categoryInput.trim())
          .single();

        if (existing) {
          finalCategoryId = existing.id;
        } else {
          const { data: newCat, error: catError } = await supabase
            .from("categories")
            .insert({ name: categoryInput.trim() })
            .select()
            .single();
          if (catError) throw catError;
          finalCategoryId = newCat.id;
        }
      }

      // 2. Get or create global product
      const { data: existingProduct } = await supabase
        .from("products")
        .select("id")
        .ilike("name", name.trim())
        .eq("category_id", finalCategoryId)
        .single();

      let productId: string;
      if (existingProduct) {
        productId = existingProduct.id;
      } else {
        const { data: newProduct, error: prodError } = await supabase
          .from("products")
          .insert({
            name: name.trim(),
            category_id: finalCategoryId,
            ownership_type_id: ownershipTypeId,
            notes: notes.trim() || null,
          })
          .select()
          .single();
        if (prodError) throw prodError;
        productId = newProduct.id;
      }

      // 3. Check if store already has this product
      const { data: existingStoreProd } = await supabase
        .from("store_products")
        .select("id")
        .eq("store_id", store.id)
        .eq("product_id", productId)
        .single();

      if (existingStoreProd) {
        toast.error("This product already exists in this store. Use restock to add quantity.");
        setLoading(false);
        return;
      }

      // 4. Generate unique SKU
      const sku = generateSKU(store.name, categoryInput);
      const storeProductId = crypto.randomUUID();

      // 5. Insert store_product
      const { error: spError } = await supabase.from("store_products").insert({
        id: storeProductId,
        store_id: store.id,
        product_id: productId,
        quantity: parseInt(quantity) || 0,
        sku,
        low_stock_threshold: parseInt(lowStockThreshold) || 5,
        cost_price: costPrice ? parseFloat(costPrice) : null,
      });
      if (spError) throw spError;

      // 6. Log initial stock as restock if quantity > 0
      if (parseInt(quantity) > 0) {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from("transactions").insert({
          store_id: store.id,
          store_product_id: storeProductId,
          user_id: user!.id,
          action: "restock",
          quantity_changed: parseInt(quantity),
          quantity_before: 0,
          quantity_after: parseInt(quantity),
          notes: "Initial stock",
        });
      }

      toast.success("Product added successfully!");
      router.push(`/products/${storeProductId}`);
    } catch (err: unknown) {
      const msg =
        (err as { message?: string })?.message || "Something went wrong";
      console.error("Add product error:", err);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pt-5 pb-4">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center bg-white border border-slate-200 rounded-xl min-h-0">
          <ArrowLeft size={18} className="text-slate-600" />
        </button>
        <h1 className="text-xl font-bold text-slate-900">Add Product</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Product details</p>

          <Input
            label="Product name"
            placeholder="e.g. iPhone 15 Case"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          {/* Category with autocomplete */}
          <div className="relative">
            <Input
              label="Category"
              placeholder="e.g. Phone Cases"
              value={categoryInput}
              onChange={(e) => handleCategoryInput(e.target.value)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              icon={<Tag size={16} />}
              required
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                <p className="text-xs text-slate-400 px-3 pt-2 pb-1 font-medium">Existing categories</p>
                {suggestions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onMouseDown={() => selectCategory(s)}
                    className="w-full text-left px-3 py-2.5 text-sm hover:bg-indigo-50 text-slate-700 font-medium min-h-0"
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Ownership type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Ownership type</label>
            <div className="flex gap-2 flex-wrap">
              {ownershipTypes.map((ot) => (
                <button
                  key={ot.id}
                  type="button"
                  onClick={() => setOwnershipTypeId(ot.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all min-h-0
                    ${ownershipTypeId === ot.id
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                    }`}
                >
                  {ot.name}
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Notes (optional)"
            placeholder="Any extra details..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Stock</p>
          <Input
            label="Initial quantity"
            type="number"
            min="0"
            placeholder="0"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />
          <Input
            label="Cost price per unit"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={costPrice}
            onChange={(e) => setCostPrice(e.target.value)}
            required
          />
          <Input
            label="Low stock alert threshold"
            type="number"
            min="1"
            placeholder="5"
            value={lowStockThreshold}
            onChange={(e) => setLowStockThreshold(e.target.value)}
          />
        </div>

        <Button type="submit" loading={loading} fullWidth size="lg">
          Add product
        </Button>
      </form>
    </div>
  );
}
