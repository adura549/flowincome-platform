import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { naira, txRef, dateShort } from "../lib/format";
import { verifyOnServer, openFlutterwave } from "../lib/pay";

export default function Affiliate() {
  const { user, profile, loading: authLoading } = useAuth();

  const [settings, setSettings] = useState(null);
  const [aff, setAff] = useState(null);
  const [courses, setCourses] = useState([]);
  const [sales, setSales] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function load() {
    setLoading(true);
    const { data: s } = await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle();
    setSettings(s);

    const { data: c } = await supabase
      .from("courses").select("id,title,slug,price_ngn,is_free")
      .eq("is_published", true).order("sort_order");
    setCourses((c || []).filter((x) => !x.is_free && Number(x.price_ngn) > 0));

    if (user) {
      const { data: a } = await supabase.from("affiliates").select("*").eq("user_id", user.id).maybeSingle();
      setAff(a || null);
      if (a) {
        const [{ data: r }, { data: p }] = await Promise.all([
          supabase.rpc("my_referrals"),
          supabase.from("payout_requests").select("*").eq("affiliate_id", a.id).order("created_at", { ascending: false }),
        ]);
        setSales(r || []);
        setPayouts(p || []);
      }
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!authLoading) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const freeOpen = settings?.affiliate_free_until && new Date(settings.affiliate_free_until) > new Date();
  const fee = Number(settings?.affiliate_fee_ngn || 0);
  const rate = Number(aff?.rate || settings?.commission_rate || 30);

  async function joinFree() {
    setErr(""); setBusy(true);
    const { error } = await supabase.rpc("join_affiliate_free");
    setBusy(false);
    if (error) return setErr(error.message);
    load();
  }

  async function joinPaid() {
    setErr(""); setBusy(true);
    const ref = txRef();
    const { error } = await supabase.from("orders").insert({
      user_id: user.id,
      email: user.email,
      full_name: profile?.full_name || "",
      phone: profile?.phone || "",
      item_type: "affiliate_fee",
      amount: fee,
      currency: "NGN",
      tx_ref: ref,
      status: "pending",
    });
    if (error) { setBusy(false); return setErr("Could not start payment. " + error.message); }

    const res = await openFlutterwave({
      ref,
      amount: fee,
      customer: { email: user.email, phone_number: profile?.phone || "", name: profile?.full_name || "" },
      title: "Flow Income Academy",
      description: "Affiliate programme sign up",
    });

    if (!res.transactionId) {
      setBusy(false);
      if (res.error) setErr(res.error);
      return;
    }

    setMsg("Confirming your payment, please wait...");
    const v = await verifyOnServer(ref, res.transactionId);
    setMsg("");
    setBusy(false);
    if (!v.ok) return setErr(v.error || "Could not confirm payment.");
    load();
  }

  if (authLoading || loading) {
    return <div className="max-w-5xl mx-auto px-5 py-24 text-center text-muted">Loading...</div>;
  }

  // ================= NOT AN AFFILIATE YET =================
  if (!aff) {
    return (
      <div className="max-w-5xl mx-auto px-5 py-14">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-block chip bg-mint/15 border border-mint/30 text-mint mb-5">
            Affiliate programme
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white leading-tight mb-4">
            Recommend a course.<br />
            <span className="text-gold">Earn {rate}% of every sale.</span>
          </h1>
          <p className="text-muted text-lg">
            Share your link. When someone buys any course through it, {rate}% of what they paid is yours.
            Everything is tracked automatically, so you never have to argue about who brought a buyer.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5 mb-12">
          {[
            ["Get your link", "Join once and you get a personal link that works for every course on the site."],
            ["Share it", "Post it on your WhatsApp status, TikTok, Instagram or anywhere your people are."],
            ["Get paid", "Every confirmed sale adds to your balance. Request a payout to your bank anytime above the minimum."],
          ].map(([t, d], i) => (
            <div key={t} className="panel p-6">
              <div className="w-9 h-9 rounded-full bg-gold/15 text-gold grid place-items-center font-black mb-4">{i + 1}</div>
              <h3 className="font-bold text-white mb-2">{t}</h3>
              <p className="text-sm text-muted leading-relaxed">{d}</p>
            </div>
          ))}
        </div>

        <div className="panel p-8 max-w-xl mx-auto text-center border-gold/25">
          {freeOpen ? (
            <>
              <div className="chip bg-mint/15 text-mint inline-block mb-4">Launch offer</div>
              <h2 className="text-2xl font-black text-white mb-2">Join free until {dateShort(settings.affiliate_free_until)}</h2>
              <p className="text-muted mb-6">
                After that, sign up costs <span className="text-white font-semibold">{naira(fee)}</span>.
                Join now and you keep your spot for good.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-black text-white mb-2">One time sign up: {naira(fee)}</h2>
              <p className="text-muted mb-6">Pay once, earn {rate}% on every sale you bring, for as long as you are active.</p>
            </>
          )}

          {!user ? (
            <div className="flex gap-3 justify-center flex-wrap">
              <Link to="/register" className="btn-gold">Create an account to join</Link>
              <Link to="/login?next=/affiliate" className="btn-ghost">Sign in</Link>
            </div>
          ) : freeOpen ? (
            <button onClick={joinFree} disabled={busy} className="btn-gold w-full">
              {busy ? "Setting up..." : "Join the affiliate programme free"}
            </button>
          ) : (
            <button onClick={joinPaid} disabled={busy} className="btn-gold w-full">
              {busy ? "Processing..." : "Pay " + naira(fee) + " and join"}
            </button>
          )}

          {msg && <p className="text-sm text-gold mt-4">{msg}</p>}
          {err && <p className="text-sm text-red-400 mt-4">{err}</p>}
        </div>
      </div>
    );
  }

  // ================= AFFILIATE DASHBOARD =================
  return <Dashboard aff={aff} rate={rate} courses={courses} sales={sales}
    payouts={payouts} settings={settings} reload={load} />;
}

function Dashboard({ aff, rate, courses, sales, payouts, settings, reload }) {
  const origin = window.location.origin;
  const mainLink = origin + "/?ref=" + aff.code;

  const pending = payouts.filter((p) => p.status === "pending").reduce((a, p) => a + Number(p.amount), 0);
  const balance = Number(aff.total_earned) - Number(aff.total_paid) - pending;
  const minPayout = Number(settings?.min_payout_ngn || 0);

  const [copied, setCopied] = useState("");
  const [f, setF] = useState({ amount: "", bank: "", number: "", name: "" });
  const [pmsg, setPmsg] = useState("");
  const [perr, setPerr] = useState("");
  const [pbusy, setPbusy] = useState(false);

  function copy(text, key) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(""), 2000);
    });
  }

  async function requestPayout(e) {
    e.preventDefault();
    setPerr(""); setPmsg(""); setPbusy(true);
    const { error } = await supabase.rpc("request_payout", {
      p_amount: Number(f.amount || 0),
      p_bank: f.bank.trim(),
      p_number: f.number.trim(),
      p_name: f.name.trim(),
    });
    setPbusy(false);
    if (error) return setPerr(error.message);
    setPmsg("Request sent. You will be paid to the account you entered.");
    setF({ amount: "", bank: f.bank, number: f.number, name: f.name });
    reload();
  }

  const shareMsg =
    "I have been learning from Flow Income Academy and I think you will find it useful. " +
    "They teach practical skills you can actually earn from, step by step, and you pay once and keep it. " +
    "Have a look here: " + mainLink;

  if (!aff.is_active) {
    return (
      <div className="max-w-xl mx-auto px-5 py-24 text-center">
        <h1 className="text-2xl font-black text-white mb-3">Your affiliate account is paused</h1>
        <p className="text-muted">Please contact support to find out why.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-5 py-12 space-y-6">
      <div>
        <div className="text-[11px] font-bold text-gold tracking-widest uppercase mb-1">Affiliate dashboard</div>
        <h1 className="text-3xl font-black text-white">Your code: <span className="text-gold font-mono">{aff.code}</span></h1>
        <p className="text-muted mt-1">You earn {rate}% of every confirmed sale through your links.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          ["Link clicks", aff.clicks || 0],
          ["Sales", aff.sales_count || 0],
          ["Total earned", naira(aff.total_earned)],
          ["Paid to you", naira(aff.total_paid)],
          ["Available", naira(balance)],
        ].map(([l, v]) => (
          <div key={l} className="panel p-5">
            <div className="text-xs text-muted mb-1.5">{l}</div>
            <div className="text-xl font-black text-gold">{v}</div>
          </div>
        ))}
      </div>

      <div className="panel p-6 space-y-4">
        <h2 className="font-bold text-white">Your main link</h2>
        <p className="text-sm text-muted">Works for every course. Anyone who clicks it and buys within 30 days counts as your sale.</p>
        <div className="flex gap-2">
          <input className="field font-mono text-sm" readOnly value={mainLink} />
          <button onClick={() => copy(mainLink, "main")} className="btn-gold text-sm whitespace-nowrap">
            {copied === "main" ? "Copied" : "Copy"}
          </button>
        </div>

        <div className="pt-2">
          <label className="label">Message you can send</label>
          <textarea className="field text-sm" rows={3} readOnly value={shareMsg} />
          <button onClick={() => copy(shareMsg, "msg")} className="btn-ghost text-sm mt-2">
            {copied === "msg" ? "Copied" : "Copy message"}
          </button>
          <p className="text-xs text-white/30 mt-2">Change it to your own words before sending. People respond better to a real person than a template.</p>
        </div>
      </div>

      <div className="panel p-6">
        <h2 className="font-bold text-white mb-4">Links for each course</h2>
        {courses.length === 0 ? (
          <p className="text-sm text-muted">No paid courses are live yet.</p>
        ) : (
          <div className="space-y-2">
            {courses.map((c) => {
              const link = origin + "/course/" + c.slug + "?ref=" + aff.code;
              const earn = Math.round((Number(c.price_ngn) * rate) / 100);
              return (
                <div key={c.id} className="flex items-center gap-3 py-3 border-b border-white/5 last:border-0 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <div className="text-sm text-white font-medium">{c.title}</div>
                    <div className="text-xs text-muted">
                      Price {naira(c.price_ngn)}. You earn <span className="text-mint font-semibold">{naira(earn)}</span> per sale
                    </div>
                  </div>
                  <button onClick={() => copy(link, c.id)} className="btn-ghost text-sm py-2 px-4">
                    {copied === c.id ? "Copied" : "Copy link"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="panel p-6">
          <h2 className="font-bold text-white mb-1">Request a payout</h2>
          <p className="text-sm text-muted mb-5">
            Available now: <span className="text-gold font-semibold">{naira(balance)}</span>. Minimum {naira(minPayout)}.
          </p>
          <form onSubmit={requestPayout} className="space-y-3">
            <input className="field" type="number" placeholder="Amount in Naira" value={f.amount}
              onChange={(e) => setF({ ...f, amount: e.target.value })} />
            <input className="field" placeholder="Bank name" value={f.bank}
              onChange={(e) => setF({ ...f, bank: e.target.value })} />
            <input className="field" placeholder="Account number" value={f.number}
              onChange={(e) => setF({ ...f, number: e.target.value })} />
            <input className="field" placeholder="Account name" value={f.name}
              onChange={(e) => setF({ ...f, name: e.target.value })} />
            <button className="btn-gold w-full" disabled={pbusy || balance < minPayout}>
              {pbusy ? "Sending..." : balance < minPayout ? "Reach " + naira(minPayout) + " to request" : "Request payout"}
            </button>
            {pmsg && <p className="text-sm text-mint">{pmsg}</p>}
            {perr && <p className="text-sm text-red-400">{perr}</p>}
          </form>

          {payouts.length > 0 && (
            <div className="mt-6 pt-5 border-t border-white/5 space-y-2">
              <div className="text-xs font-bold text-muted uppercase tracking-wider">Your requests</div>
              {payouts.map((p) => (
                <div key={p.id} className="flex justify-between text-sm">
                  <span className="text-muted">{dateShort(p.created_at)}</span>
                  <span className="text-white">{naira(p.amount)}</span>
                  <span className={p.status === "paid" ? "text-mint" : p.status === "rejected" ? "text-red-400" : "text-gold"}>
                    {p.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel p-6">
          <h2 className="font-bold text-white mb-4">Your sales</h2>
          {sales.length === 0 ? (
            <p className="text-sm text-muted">No sales yet. Share your link and they will show here as they come in.</p>
          ) : (
            <div className="space-y-2">
              {sales.map((s, i) => (
                <div key={i} className="flex justify-between gap-3 text-sm py-2 border-b border-white/5 last:border-0">
                  <span className="text-muted shrink-0">{dateShort(s.created_at)}</span>
                  <span className="text-white flex-1 truncate">{s.course_title}</span>
                  <span className="text-mint font-semibold shrink-0">+{naira(s.commission)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="text-xs text-white/30 leading-relaxed">
        Commission is only paid on sales confirmed by our payment system. Your own purchases do not earn commission.
        Spamming links or making false promises about results will get an account paused.
      </div>
    </div>
  );
}
