import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import type { Subscription } from "@/types/database";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const rateLimit = await checkRateLimit(`billing:${user.id}`, 20);
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.resetInSeconds);
    }

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!subscription) {
      const defaultSub: Partial<Subscription> = {
        plan: "free",
        status: "active",
        cancel_at_period_end: false,
      };
      return NextResponse.json(defaultSub);
    }

    return NextResponse.json(subscription);
  } catch (error) {
    logger.error("Subscription API error:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
