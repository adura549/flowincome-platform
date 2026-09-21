import { createClient } from "@supabase/supabase-js";

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const LINK_ONLY = ["telegram", "whatsapp", "drive", "external"];

async function confirmWithFlutterwave(secret, transactionId, txRef, expected) {
  const r = await fetch(
    "https://api.flutterwave.com/v3/transactions/" + encodeURIComponent(transactionId) + "/verify",
    { headers: { Authorization: "Bearer " + secret } }
  );
  const v = await r.json().catch(() => null);
  const d = v?.data;
  const good =
    v?.status === "success" &&
    d &&
    d.status === "successful" &&
    d.tx_ref === txRef &&
    d.currency === "NGN" &&
    Number(d.amount) >= expected;
  return good ? String(d.id) : null;
}

export default async (req) => {
  if (req.method !== "POST") return json(405, { ok: false, error: "Method not allowed" });

  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const FLW_SECRET = process.env.FLW_SECRET_KEY;

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return json(500, { ok: false, error: "Server is not configured yet." });
  }

  let body;
  try { body = await req.json(); } catch { return json(400, { ok: false, error: "Bad request" }); }
  const { tx_ref, transaction_id } = body || {};
  if (!tx_ref) return json(400, { ok: false, error: "Missing payment reference." });

  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  const { data: u, error: uErr } = await db.auth.getUser(token);
  if (uErr || !u?.user) return json(401, { ok: false, error: "Please sign in again." });
  const uid = u.user.id;

  const { data: order } = await db.from("orders").select("*").eq("tx_ref", tx_ref).maybeSingle();
  if (!order) return json(404, { ok: false, error: "Order not found." });
  if (order.user_id !== uid) return json(403, { ok: false, error: "This order belongs to someone else." });

  // ============ AFFILIATE SIGN UP FEE ============
  if (order.item_type === "affiliate_fee") {
    if (order.status !== "paid") {
      const { data: s } = await db.from("site_settings").select("affiliate_fee_ngn").eq("id", 1).maybeSingle();
      const expected = Math.round(Number(s?.affiliate_fee_ngn || 0));

      let flwRef = null;
      if (expected > 0) {
        if (!FLW_SECRET) return json(500, { ok: false, error: "Payment checking is not configured yet." });
        if (!transaction_id) return json(400, { ok: false, error: "Missing transaction id." });
        flwRef = await confirmWithFlutterwave(FLW_SECRET, transaction_id, tx_ref, expected);
        if (!flwRef) {
          await db.from("orders").update({ status: "failed" }).eq("id", order.id);
          return json(402, { ok: false, error: "We could not confirm this payment. If you were charged, contact support with your reference." });
        }
      }

      await db.from("orders").update({
        status: "paid", amount: expected, flw_ref: flwRef, paid_at: new Date().toISOString(),
      }).eq("id", order.id);
    }

    const { data: code, error: aErr } = await db.rpc("create_affiliate_for", { p_user: uid, p_source: "paid" });
    if (aErr) return json(500, { ok: false, error: "Payment received but affiliate setup failed. Contact support." });
    return json(200, { ok: true, affiliate_code: code });
  }

  // ============ COURSE PURCHASE ============
  const { data: course } = await db
    .from("courses").select("id, slug, price_ngn, is_free, access_type")
    .eq("id", order.course_id).maybeSingle();
  if (!course) return json(404, { ok: false, error: "Course not found." });

  const finishAccess = async () => {
    await db.from("enrollments").upsert(
      { user_id: uid, course_id: course.id, order_id: order.id, source: "purchase" },
      { onConflict: "user_id,course_id", ignoreDuplicates: true }
    );
    if (LINK_ONLY.includes(course.access_type)) {
      await db.rpc("issue_certificate", { p_user: uid, p_course: course.id, p_basis: "enrolment" });
    }
  };

  if (order.status === "paid") {
    await finishAccess();
    return json(200, { ok: true, slug: course.slug });
  }

  let expected = Number(course.price_ngn || 0);
  let coupon = null;

  if (order.coupon_code) {
    const { data: c } = await db
      .from("coupons").select("*")
      .eq("code", order.coupon_code).eq("is_active", true).maybeSingle();

    const notExpired = c && (!c.expires_at || new Date(c.expires_at) > new Date());
    const hasUses = c && (!c.max_uses || (c.used_count || 0) < c.max_uses);

    if (c && notExpired && hasUses) {
      coupon = c;
      if (c.discount_type === "free") expected = 0;
      else if (c.discount_type === "percent") expected = expected - (expected * Number(c.discount_val || 0)) / 100;
      else expected = Math.max(0, expected - Number(c.discount_val || 0));
    }
  }
  if (course.is_free) expected = 0;
  expected = Math.round(expected);

  let flwRef = null;
  if (expected > 0) {
    if (!FLW_SECRET) return json(500, { ok: false, error: "Payment checking is not configured yet." });
    if (!transaction_id) return json(400, { ok: false, error: "Missing transaction id." });
    flwRef = await confirmWithFlutterwave(FLW_SECRET, transaction_id, tx_ref, expected);
    if (!flwRef) {
      await db.from("orders").update({ status: "failed" }).eq("id", order.id);
      return json(402, { ok: false, error: "We could not confirm this payment. If you were charged, contact support with your reference." });
    }
  }

  await db.from("orders").update({
    status: "paid",
    amount: expected,
    flw_ref: flwRef,
    paid_at: new Date().toISOString(),
  }).eq("id", order.id);

  await finishAccess();

  if (coupon) {
    await db.from("coupons").update({ used_count: (coupon.used_count || 0) + 1 }).eq("id", coupon.id);
  }

  // affiliate commission (the database blocks self referral and duplicates)
  if (order.ref_code && expected > 0) {
    await db.rpc("record_referral", { p_order: order.id, p_code: order.ref_code, p_amount: expected });
  }

  return json(200, { ok: true, slug: course.slug });
};
