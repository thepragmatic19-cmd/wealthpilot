import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/env";
import { logger } from "@/lib/logger";
import type Stripe from "stripe";

// Use service role client to bypass RLS
function getServiceClient() {
  const env = getServerEnv();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
}

export function getPlanFromPriceId(priceId: string): "pro" | "elite" | "free" {
  const env = getServerEnv();
  if (priceId === env.STRIPE_PRO_PRICE_ID) return "pro";
  if (priceId === env.STRIPE_ELITE_PRICE_ID) return "elite";
  return "free";
}

async function upsertSubscription(
  stripeSubscription: Stripe.Subscription,
  customerId: string
) {
  const supabase = getServiceClient();

  const firstItem = stripeSubscription.items.data[0];
  const priceId = firstItem?.price.id;
  const plan = priceId ? getPlanFromPriceId(priceId) : "free";

  // In Stripe v20+, period dates are on the item level
  const periodStart = firstItem?.current_period_start;
  const periodEnd = firstItem?.current_period_end;

  const { error } = await supabase
    .from("subscriptions")
    .update({
      stripe_subscription_id: stripeSubscription.id,
      stripe_customer_id: customerId,
      plan,
      status: stripeSubscription.status === "active" ? "active" : stripeSubscription.status === "past_due" ? "past_due" : stripeSubscription.status === "canceled" ? "canceled" : "active",
      current_period_start: periodStart
        ? new Date(periodStart * 1000).toISOString()
        : null,
      current_period_end: periodEnd
        ? new Date(periodEnd * 1000).toISOString()
        : null,
      cancel_at_period_end: stripeSubscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_customer_id", customerId);

  if (error) {
    logger.error("Error upserting subscription:", error);
  }
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      getServerEnv().STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    logger.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription" && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );
          const customerId =
            typeof session.customer === "string"
              ? session.customer
              : session.customer?.id;

          if (customerId) {
            // Link customer to user if not already linked
            const supabase = getServiceClient();
            const userId = session.metadata?.supabase_user_id;
            if (userId) {
              await supabase
                .from("subscriptions")
                .update({ stripe_customer_id: customerId })
                .eq("user_id", userId);
            }
            await upsertSubscription(subscription, customerId);
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;
        await upsertSubscription(subscription, customerId);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;

        const supabase = getServiceClient();
        await supabase
          .from("subscriptions")
          .update({
            plan: "free",
            status: "canceled",
            stripe_subscription_id: null,
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_customer_id", customerId);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer?.id;

        if (customerId) {
          const supabase = getServiceClient();
          await supabase
            .from("subscriptions")
            .update({
              status: "past_due",
              updated_at: new Date().toISOString(),
            })
            .eq("stripe_customer_id", customerId);
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
