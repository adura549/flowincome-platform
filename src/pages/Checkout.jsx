import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { naira, txRef } from "../lib/format";
import { verifyOnServer, openFlutterwave } from "../lib/pay";
import { getRef } from "../lib/ref";

export default function Checkout() {
  const { slug } = useParams();
  const { user, profile } = useAuth();
  const nav = useNavigate();

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [status, setStatus] = useState("");
  const [err, setErr] = useState("");

  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [coupon, setCoupon] = useState("");
  const [applied, setApplied] = useState(null);
  const [couponMsg, setCouponMsg] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("courses").select("*").eq("slug", slug).eq("is_published", true).maybeSingle();
      setCourse(data);
      setLoading(false);
    })();
  }, [slug]);

  useEffect(() => {
    setForm((f) => ({
      name: f.name || profile?.full_name || "",
      email: f.email || user?.email || "",
      phone: f.phone || profile?.phone || "",
    }));
  }, [user, profile]);

  const base = Number(course?.price_ngn || 0);
  let total = base;
  if (applied) {
    if (applied.discount_type === "free") total = 0;
    else if (applied.discount_type === "percent") total = base - (base * applied.discount_val) / 100;
    else total = Math.max(0, base - applied.discount_val);
  }
  total = Math.round(total);

  async function applyCoupon() {
    setCouponMsg("");
    const code = coupon.trim().toUpperCase();
    if (!code) return;

    const { data } = await supabase
      .from("coupons").select("*").eq("code", code).eq("is_active", true).maybeSingle();

    if (!data) { setCouponMsg("That code is not valid."); setApplied(null); return; }
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      setCouponMsg("That code has expired."); setApplied(null); return;
    }
    if (data.max_uses && data.used_count >= data.max_uses) {
      setCouponMsg("That code has reached its limit."); setApplied(null); return;
    }
    setApplied(data);
    setCouponMsg("Code applied.");
  }

  async function finish(ref, transactionId) {
    setStatus("Confirming your payment, please wait...");
    const res = await verifyOnServer(ref, transactionId);
    if (res.ok) {
      window.location.href = "/payment/success?ref=" + ref + "&course=" + (res.slug || course.slug);
    } else {
      setStatus("");
      setErr(res.error || "Something went wrong confirming your payment.");
      setPaying(false);
    }
  }

  async function handlePay() {
    setErr("");
    if (!user) return nav("/login?next=/checkout/" + slug);
    if (!form.name || !form.email) return setErr("Please enter your name and email.");

    setPaying(true);
    const ref = txRef();

    const { error: oErr } = await supabase.from("orders").insert({
      user_id: user.id,
      email: form.email,
      full_name: form.name,
      phone: form.phone,
      item_type: "course",
      course_id: course.id,
      amount: total,
      currency: "NGN",
      tx_ref: ref,
      coupon_code: applied?.code || null,
      ref_code: getRef(),
      status: "pending",
    });

    if (oErr) {
      setErr("Could not start the order. " + oErr.message);
      setPaying(false);
      return;
    }

    // fully discounted by a coupon, no card payment needed
    if (total === 0) {
      await finish(ref, null);
      return;
    }

    const res = await openFlutterwave({
      ref,
      amount: total,
      customer: { email: form.email, phone_number: form.phone, name: form.name },
      title: "Flow Income Academy",
      description: course.title,
    });

    if (res.transactionId) {
      await finish(ref, res.transactionId);
    } else {
      if (res.error) setErr(res.error);
      setPaying(false);
    }
  }

  if (loading) return <div className="max-w-4xl mx-auto px-5 py-24 text-center text-muted">Loading...</div>;
  if (!course) return <div className="max-w-4xl mx-auto px-5 py-24 text-center text-muted">Course not found.</div>;

  return (
    <div className="max-w-4xl mx-auto px-5 py-12">
      <Link to={"/course/" + slug} className="text-sm text-muted hover:text-white">
        Back to course
      </Link>
      <h1 className="text-3xl font-black text-white mt-4 mb-8">Checkout</h1>

      <div className="grid md:grid-cols-5 gap-6">
        <div className="md:col-span-3 panel p-6 space-y-4">
          <h2 className="font-bold text-white">Your details</h2>

          <div>
            <label className="label">Full name</label>
            <input className="field" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="field" type="email" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="label">Phone number</label>
            <input className="field" value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="08012345678" />
          </div>

          <div className="pt-2">
            <label className="label">Have a discount code?</label>
            <div className="flex gap-2">
              <input className="field" value={coupon}
                onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                placeholder="Enter code" />
              <button onClick={applyCoupon} className="btn-ghost whitespace-nowrap px-4">Apply</button>
            </div>
            {couponMsg && (
              <p className={"text-xs mt-2 " + (applied ? "text-mint" : "text-red-400")}>{couponMsg}</p>
            )}
          </div>

          {status && (
            <div className="bg-gold/10 border border-gold/30 rounded-lg p-3 text-sm text-gold">
              {status}
            </div>
          )}

          {err && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-300">
              {err}
            </div>
          )}
        </div>

        <div className="md:col-span-2">
          <div className="panel p-6 sticky top-24">
            <h2 className="font-bold text-white mb-4">Order summary</h2>

            <div className="flex gap-3 pb-4 mb-4 border-b border-white/5">
              <div className="w-14 h-14 rounded-lg bg-gold/10 grid place-items-center text-2xl shrink-0 overflow-hidden">
                {course.thumbnail_url
                  ? <img src={course.thumbnail_url} alt="" className="w-full h-full object-cover" />
                  : (course.emoji || "\ud83d\udcd8")}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-white text-sm leading-snug line-clamp-2">
                  {course.title}
                </div>
                <div className="text-xs text-muted mt-1">Lifetime access</div>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-muted">
                <span>Subtotal</span><span>{naira(base)}</span>
              </div>
              {applied && (
                <div className="flex justify-between text-mint">
                  <span>Discount ({applied.code})</span>
                  <span>- {naira(base - total)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-black text-white pt-3 border-t border-white/5">
                <span>Total</span>
                <span className="text-gold">{total === 0 ? "Free" : naira(total)}</span>
              </div>
            </div>

            <button onClick={handlePay} disabled={paying} className="btn-gold w-full mt-6">
              {paying ? "Processing..." : total === 0 ? "Get access" : "Pay " + naira(total)}
            </button>

            <p className="text-[11px] text-muted text-center mt-3 leading-relaxed">
              Secure payment by Flutterwave. Card, bank transfer and USSD accepted.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
