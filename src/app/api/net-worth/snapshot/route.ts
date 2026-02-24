import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const { data, error } = await supabase
      .from("net_worth_snapshots")
      .select("snapshot_date, total_assets, total_debts, net_worth")
      .eq("user_id", user.id)
      .order("snapshot_date", { ascending: true })
      .limit(12);

    if (error) throw error;
    return NextResponse.json({ snapshots: data || [] });
  } catch (err) {
    console.error("Net worth GET error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const body = await request.json();
    const total_assets = Number(body.total_assets) || 0;
    const total_debts = Number(body.total_debts) || 0;

    const { error } = await supabase
      .from("net_worth_snapshots")
      .insert({
        user_id: user.id,
        total_assets,
        total_debts,
      });

    // Ignore unique constraint violation (already snapshotted today)
    if (error && error.code !== "23505") throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Net worth POST error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
