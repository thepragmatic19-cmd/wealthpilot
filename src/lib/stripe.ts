import Stripe from "stripe";
import { getServerEnv } from "@/env";

export const stripe = new Stripe(getServerEnv().STRIPE_SECRET_KEY, {
  apiVersion: "2026-01-28.clover",
  typescript: true,
});
