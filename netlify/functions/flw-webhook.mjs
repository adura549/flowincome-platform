import { createClient } from "@supabase/supabase-js";
import { processOrder } from "../shared/process-order.mjs";

// Flutterwave calls this directly after every payment, even if the student closed their browser.
const ok = () => new Response("ok", { status: 200 });

export default async (req) => {
  if (req.method !== "POST") return ok();

  const HASH = process.env.FLW_WEBHOOK_HASH;
  if (!HASH || req.headers.get("verif-hash") !== HASH) {
    return new Response("unauthorised", { status: 401 });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) return new Response("not configured", { status: 500 });

  const payload = await req.json().catch(() => null);
  const d = payload?.data || payload;
  const txRef = d?.tx_ref || d?.txRef;

  // ignore payments that did not come from this site
  if (!txRef || !String(txRef).startsWith("FIA-")) return ok();

  const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const { data: order } = await db.from("orders").select("*").eq("tx_ref", txRef).maybeSingle();
  if (!order) return ok();

  // we never trust the webhook body for the amount, processOrder re-checks with Flutterwave
  await processOrder(db, order, { transactionId: d?.id || null, secret: process.env.FLW_SECRET_KEY });
  return ok();
};
