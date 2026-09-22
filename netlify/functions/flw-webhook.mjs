import { createClient } from "@supabase/supabase-js";
import { processOrder } from "../shared/process-order.mjs";

// Flutterwave sends every payment notification for the whole account here.
// Flow Income Academy payments (reference starts with FIA-) are handled here.
// Everything else is passed on unchanged to the addresses in FLW_FORWARD_URLS,
// so other projects on the same Flutterwave account keep working.

const ok = () => new Response("ok", { status: 200 });

const SKIP_HEADERS = new Set([
  "host", "content-length", "connection", "accept-encoding", "transfer-encoding",
  "x-forwarded-for", "x-forwarded-proto", "x-forwarded-host", "x-real-ip", "x-country",
  "x-language", "via", "client-ip",
]);

function copyHeaders(req) {
  const out = {};
  req.headers.forEach((value, key) => {
    const k = key.toLowerCase();
    if (SKIP_HEADERS.has(k) || k.startsWith("x-nf-") || k.startsWith("cf-")) return;
    out[key] = value;
  });
  return out;
}

async function forwardAll(urls, rawBody, headers) {
  let allOk = true;
  for (const url of urls) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const r = await fetch(url, { method: "POST", headers, body: rawBody, signal: ctrl.signal });
      if (!r.ok) allOk = false;
    } catch {
      allOk = false;
    } finally {
      clearTimeout(timer);
    }
  }
  return allOk;
}

export default async (req) => {
  if (req.method !== "POST") return ok();

  const HASH = process.env.FLW_WEBHOOK_HASH;
  if (!HASH || req.headers.get("verif-hash") !== HASH) {
    return new Response("unauthorised", { status: 401 });
  }

  const raw = await req.text();
  let payload = null;
  try { payload = JSON.parse(raw); } catch { /* not json */ }
  const d = payload?.data || payload;
  const txRef = String(d?.tx_ref || d?.txRef || "");

  // ---------- not ours: pass it on ----------
  if (!txRef.startsWith("FIA-")) {
    const urls = (process.env.FLW_FORWARD_URLS || "")
      .split(",").map((s) => s.trim()).filter(Boolean);
    if (urls.length === 0) return ok();
    const delivered = await forwardAll(urls, raw, copyHeaders(req));
    // if the other project did not accept it, tell Flutterwave to retry later
    return delivered ? ok() : new Response("forward failed", { status: 502 });
  }

  // ---------- ours ----------
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) return new Response("not configured", { status: 500 });

  const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const { data: order } = await db.from("orders").select("*").eq("tx_ref", txRef).maybeSingle();
  if (!order) return ok();

  // never trust the webhook body for the amount, processOrder re-checks with Flutterwave
  await processOrder(db, order, { transactionId: d?.id || null, secret: process.env.FLW_SECRET_KEY });
  return ok();
};
