import { createClient } from "@supabase/supabase-js";

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export default async (req) => {
  if (req.method !== "POST") return json(405, { ok: false, error: "Method not allowed" });

  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const FLW_SECRET   = process.env.FLW_SECRET_KEY;

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return json(500, { ok: false, error: "Server is not configured yet." });
  }

  let body;
  try { body = await req.json(); } catch { return json(400, { ok: false, error: "Bad request" }); }
  const { tx_ref, transaction_id } = body || {};
  if (!tx_ref) return json(400, { ok: false, error: "Missing payment reference." });

  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  // who is asking
  const { data: u, error: uErr } = await db.auth.getUser(token);
  if (uErr || !u?.user) return json(401, { ok: false, error: "Please sign in again." });
  const uid = u.user.id;

  // the order
  const { data: order } = await db.from("orders").select("*").eq("tx_ref", tx_ref).maybeSingle();
  if (!order) return json(404, { ok: false, error: "Order not found." });
  if (order.user_id !== uid) return json(403, { ok: false, error: "This order belongs to someone else." });

  const { data: course } = await db
    .from("courses").select("id, slug, price_ngn, is_free")
    .eq("id", order.course_id).maybeSingle();
  if (!course) return json(404, { ok: false, error: "Course not found." });

  // already paid earlier, just make sure access exists
  if (order.status === "paid") {
    await db.from("enrollments").upsert(
      { user_id: uid, course_id: course.id, order_id: order.id, source: "purchase" },
      { onConflict: "user_id,course_id", ignoreDuplicates: true }
    );
    return json(200, { ok: true, slug: course.slug });
  }

  // work out the correct price ON THE SERVER, never trust the browser
  let expected = Number(course.price_ngn || 0);
  let coupon = null;

  if (order.coupon_code) {
    const { data: c } = await db
      .from("coupons").select("*")
      .eq("code", order.coupon_code).eq("is_active", true).maybeSingle();

    const notExpired = c && (!c.expires_at || new Date(c.expires_at) > new Date());
    const hasUses    = c && (!c.max_uses || (c.used_count || 0) < c.max_uses);

    if (c && notExpired && hasUses) {
      coupon = c;
      if (c.discount_type === "free") expected = 0;
      else if (c.discount_type === "percent") expected = expected - (expected * Number(c.discount_val || 0)) / 100;
      else expected = Math.max(0, expected - Number(c.discount_val || 0));
    }
  }
  if (course.is_free) expected = 0;
  expected = Math.round(expected);

  // confirm with Flutterwave directly
  let flwRef = null;
  if (expected > 0) {
    if (!FLW_SECRET) return json(500, { ok: false, error: "Payment checking is not configured yet." });
    if (!transaction_id) return json(400, { ok: false, error: "Missing transaction id." });

    const r = await fetch(
      "https://api.flutterwave.com/v3/transactions/" + encodeURIComponent(transaction_id) + "/verify",
      { headers: { Authorization: "Bearer " + FLW_SECRET } }
    );
    const v = await r.json().catch(() => null);
    const d = v?.data;

    const good =
      v?.status === "success" &&
      d &&
      d.status === "successful" &&
      d.tx_ref === tx_ref &&
      d.currency === "NGN" &&
      Number(d.amount) >= expected;

    if (!good) {
      await db.from("orders").update({ status: "failed" }).eq("id", order.id);
      return json(402, { ok: false, error: "We could not confirm this payment. If you were charged, contact support with your reference." });
    }
    flwRef = String(d.id);
  }

  // mark paid and grant access
  await db.from("orders").update({
    status: "paid",
    amount: expected,
    flw_ref: flwRef,
    paid_at: new Date().toISOString(),
  }).eq("id", order.id);

  await db.from("enrollments").upsert(
    { user_id: uid, course_id: course.id, order_id: order.id, source: expected === 0 ? "coupon" : "purchase" },
    { onConflict: "user_id,course_id", ignoreDuplicates: true }
  );

  if (coupon) {
    await db.from("coupons").update({ used_count: (coupon.used_count || 0) + 1 }).eq("id", coupon.id);
  }

  return json(200, { ok: true, slug: course.slug });
};
