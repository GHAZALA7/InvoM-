import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Uses service role key to bypass RLS for initial store creation
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  const { store_name, store_address, user_id } = await request.json();

  if (!store_name || !user_id) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("stores")
    .insert({ name: store_name.trim(), address: store_address?.trim() || null })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ store: data });
}
