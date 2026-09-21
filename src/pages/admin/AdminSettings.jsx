import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function AdminSettings() {
  const [s, setS] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle();
      setS({
        ...data,
        free_until_date: data?.affiliate_free_until ? data.affiliate_free_until.slice(0, 10) : "",
      });
    })();
  }, []);

  function set(k, v) { setS((p) => ({ ...p, [k]: v })); }

  async function save() {
    setBusy(true); setMsg("");
    const { error } = await supabase.from("site_settings").update({
      affiliate_fee_ngn: Number(s.affiliate_fee_ngn || 0),
      affiliate_free_until: s.free_until_date ? new Date(s.free_until_date + "T23:59:59").toISOString() : null,
      commission_rate: Number(s.commission_rate || 0),
      min_payout_ngn: Number(s.min_payout_ngn || 0),
      instructor_name: s.instructor_name,
      instructor_title: s.instructor_title,
      support_whatsapp: (s.support_whatsapp || "").replace(/[^0-9]/g, ""),
      support_email: s.support_email || null,
      legal_entity: s.legal_entity || "Flow Income Academy",
    }).eq("id", 1);
    setBusy(false);
    setMsg(error ? "Error: " + error.message : "Saved.");
    setTimeout(() => setMsg(""), 3500);
  }

  async function applyRateToAll() {
    if (!confirm("Set every current affiliate to " + s.commission_rate + "% commission?")) return;
    const { error } = await supabase.from("affiliates")
      .update({ rate: Number(s.commission_rate || 0) })
      .not("id", "is", null);
    alert(error ? error.message : "Updated all affiliates.");
  }

  if (!s) return <div className="panel p-10 text-center text-muted">Loading...</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-black text-white">Settings</h2>
        <div className="flex items-center gap-3">
          {msg && <span className={"text-sm " + (msg.startsWith("Error") ? "text-red-400" : "text-mint")}>{msg}</span>}
          <button onClick={save} disabled={busy} className="btn-gold text-sm">{busy ? "Saving..." : "Save settings"}</button>
        </div>
      </div>

      <div className="panel p-6 space-y-4">
        <h3 className="font-bold text-white">Affiliate programme</h3>

        <div>
          <label className="label">Sign up fee (Naira)</label>
          <input className="field" type="number" value={s.affiliate_fee_ngn ?? ""}
            onChange={(e) => set("affiliate_fee_ngn", e.target.value)} />
        </div>

        <div>
          <label className="label">Free sign up until</label>
          <input className="field" type="date" value={s.free_until_date}
            onChange={(e) => set("free_until_date", e.target.value)} />
          <p className="text-xs text-white/30 mt-1.5">Anyone who joins on or before this date pays nothing. After it, they pay the fee above.</p>
        </div>

        <div>
          <label className="label">Commission rate (%)</label>
          <input className="field" type="number" value={s.commission_rate ?? ""}
            onChange={(e) => set("commission_rate", e.target.value)} />
          <p className="text-xs text-white/30 mt-1.5">
            New affiliates get this rate.{" "}
            <button type="button" onClick={applyRateToAll} className="text-gold hover:underline">Apply it to all current affiliates</button>
          </p>
        </div>

        <div>
          <label className="label">Minimum payout (Naira)</label>
          <input className="field" type="number" value={s.min_payout_ngn ?? ""}
            onChange={(e) => set("min_payout_ngn", e.target.value)} />
        </div>
      </div>

      <div className="panel p-6 space-y-4">
        <h3 className="font-bold text-white">Support and legal</h3>
        <div>
          <label className="label">Support WhatsApp number</label>
          <input className="field" value={s.support_whatsapp || ""}
            onChange={(e) => set("support_whatsapp", e.target.value)} placeholder="2349162492368" />
          <p className="text-xs text-white/30 mt-1.5">Country code first, no plus sign or spaces. Shown in the footer and policy pages.</p>
        </div>
        <div>
          <label className="label">Support email (optional)</label>
          <input className="field" value={s.support_email || ""}
            onChange={(e) => set("support_email", e.target.value)} placeholder="hello@flowincome.site" />
          <p className="text-xs text-white/30 mt-1.5">Only fill this in once the mailbox actually receives mail.</p>
        </div>
        <div>
          <label className="label">Business name on policy pages</label>
          <input className="field" value={s.legal_entity || ""}
            onChange={(e) => set("legal_entity", e.target.value)} />
          <p className="text-xs text-white/30 mt-1.5">Use your registered business name if the academy runs under one.</p>
        </div>
      </div>

      <div className="panel p-6 space-y-4">
        <h3 className="font-bold text-white">Certificates</h3>
        <div>
          <label className="label">Name printed as signature</label>
          <input className="field" value={s.instructor_name || ""}
            onChange={(e) => set("instructor_name", e.target.value)} />
        </div>
        <div>
          <label className="label">Title under the signature</label>
          <input className="field" value={s.instructor_title || ""}
            onChange={(e) => set("instructor_title", e.target.value)} />
        </div>
      </div>
    </div>
  );
}
