// Shared payment logic used by verify-payment, flw-webhook and admin-recheck.
// Safe to run many times on the same order: it only grants and pays commission once.

const LINK_ONLY = ["telegram", "whatsapp", "drive", "external"];

export async function fetchFlutterwave(secret, { transactionId, txRef }) {
  const url = transactionId
    ? "https://api.flutterwave.com/v3/transactions/" + encodeURIComponent(transactionId) + "/verify"
    : "https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=" + encodeURIComponent(txRef);
  try {
    const r = await fetch(url, { headers: { Authorization: "Bearer " + secret } });
    const v = await r.json();
    return v?.status === "success" ? v.data : null;
  } catch {
    return null;
  }
}

export async function processOrder(db, order, { transactionId = null, secret }) {
  const uid = order.user_id;
  const isFee = order.item_type === "affiliate_fee";

  let course = null;
  if (!isFee) {
    const { data } = await db
      .from("courses").select("id, slug, price_ngn, is_free, access_type")
      .eq("id", order.course_id).maybeSingle();
    course = data;
    if (!course) return { ok: false, code: 404, error: "Course not found." };
  }

  const grant = async () => {
    if (isFee) {
      const { data, error } = await db.rpc("create_affiliate_for", { p_user: uid, p_source: "paid" });
      if (error) return { ok: false, code: 500, error: "Payment received but affiliate setup failed. Contact support." };
      return { ok: true, affiliate_code: data };
    }
    await db.from("enrollments").upsert(
      { user_id: uid, course_id: course.id, order_id: order.id, source: "purchase" },
      { onConflict: "user_id,course_id", ignoreDuplicates: true }
    );
    if (LINK_ONLY.includes(course.access_type)) {
      await db.rpc("issue_certificate", { p_user: uid, p_course: course.id, p_basis: "enrolment" });
    }
    return { ok: true, slug: course.slug };
  };

  if (order.status === "paid") return grant();

  // ---- work out the correct price on the server ----
  let expected = 0;
  let coupon = null;

  if (isFee) {
    const { data: s } = await db.from("site_settings").select("affiliate_fee_ngn").eq("id", 1).maybeSingle();
    expected = Number(s?.affiliate_fee_ngn || 0);
  } else {
    expected = Number(course.price_ngn || 0);
    if (order.coupon_code) {
      const { data: c } = await db.from("coupons").select("*")
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
  }
  expected = Math.round(expected);

  // ---- confirm the money with Flutterwave ----
  let flwRef = null;
  if (expected > 0) {
    if (!secret) return { ok: false, code: 500, error: "Payment checking is not configured yet." };

    const d = await fetchFlutterwave(secret, { transactionId, txRef: order.tx_ref });
    const good =
      d && d.status === "successful" && d.tx_ref === order.tx_ref &&
      d.currency === "NGN" && Number(d.amount) >= expected;

    if (!good) {
      const clearlyBad =
        d && (d.status === "failed" ||
              (d.status === "successful" && (d.tx_ref !== order.tx_ref || d.currency !== "NGN" || Number(d.amount) < expected)));
      if (clearlyBad) {
        await db.from("orders").update({ status: "failed" }).eq("id", order.id).neq("status", "paid");
        return { ok: false, code: 402, error: "This payment did not go through. If you were charged, contact support with your reference." };
      }
      // not found yet or still processing (common with bank transfer). Leave it pending.
      return { ok: false, code: 202, pending: true,
        error: "Your payment is still being confirmed. This can take a few minutes for bank transfers. You will get access automatically once it clears." };
    }
    flwRef = String(d.id);
  }

  // ---- mark paid exactly once ----
  const { data: flipped } = await db.from("orders")
    .update({ status: "paid", amount: expected, flw_ref: flwRef, paid_at: new Date().toISOString() })
    .eq("id", order.id).neq("status", "paid")
    .select("id");
  const firstTime = Array.isArray(flipped) && flipped.length > 0;

  const result = await grant();

  if (firstTime && !isFee) {
    if (coupon) {
      await db.from("coupons").update({ used_count: (coupon.used_count || 0) + 1 }).eq("id", coupon.id);
    }
    if (order.ref_code && expected > 0) {
      await db.rpc("record_referral", { p_order: order.id, p_code: order.ref_code, p_amount: expected });
    }
  }

  return result;
}
