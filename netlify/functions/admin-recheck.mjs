import { createClient } from "@supabase/supabase-js";
import { processOrder } from "../shared/process-order.mjs";

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

// Admin button: ask Flutterwave again about a stuck order and fix it if it was paid.
export default async (req) => {
  if (req.method !== "POST") return json(405, { ok: false, error: "Method not allowed" });

  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) return json(500, { ok: false, error: "Server is not configured yet." });

  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  const { data: u } = await db.auth.getUser(token);
  if (!u?.user) return json(401, { ok: false, error: "Please sign in again." });

  const { data: me } = await db.from("profiles").select("role").eq("id", u.user.id).maybeSingle();
  if (me?.role !== "admin") return json(403, { ok: false, error: "Admins only." });

  const body = await req.json().catch(() => ({}));
  const { data: order } = await db.from("orders").select("*").eq("id", body.order_id).maybeSingle();
  if (!order) return json(404, { ok: false, error: "Order not found." });

  const res = await processOrder(db, order, { transactionId: order.flw_ref || null, secret: process.env.FLW_SECRET_KEY });
  const { data: after } = await db.from("orders").select("status").eq("id", order.id).maybeSingle();
  return json(200, { ...res, status: after?.status });
};
