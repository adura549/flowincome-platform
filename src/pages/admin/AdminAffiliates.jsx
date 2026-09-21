import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { naira, dateShort } from "../../lib/format";

export default function AdminAffiliates() {
  const [affs, setAffs] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  async function load() {
    const [{ data: a }, { data: p }] = await Promise.all([
      supabase.from("affiliates").select("*").order("total_earned", { ascending: false }),
      supabase.from("payout_requests").select("*, affiliates(full_name, code, phone)")
        .order("created_at", { ascending: false }).limit(200),
    ]);
    setAffs(a || []);
    setPayouts(p || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function mark(id, status) {
    const label = status === "paid" ? "Mark this payout as PAID? Only do this after you have sent the money."
                                    : "Reject this payout request?";
    if (!confirm(label)) return;
    const { error } = await supabase.rpc("admin_mark_payout", { p_id: id, p_status: status });
    if (error) return alert(error.message);
    load();
  }

  async function toggle(a) {
    await supabase.from("affiliates").update({ is_active: !a.is_active }).eq("id", a.id);
    load();
  }

  const pendingList = payouts.filter((p) => p.status === "pending");
  const pendingSum = pendingList.reduce((s, p) => s + Number(p.amount), 0);
  const owed = affs.reduce((s, a) => s + Number(a.total_earned) - Number(a.total_paid), 0);
  const shown = affs.filter((a) =>
    !q || (a.full_name || "").toLowerCase().includes(q.toLowerCase()) || a.code.includes(q.toUpperCase())
  );

  if (loading) return <div className="panel p-10 text-center text-muted">Loading...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-black text-white">Affiliates</h2>

      <div className="grid sm:grid-cols-3 gap-4">
        {[
          ["Affiliates", affs.length],
          ["Total owed to affiliates", naira(owed)],
          ["Waiting for payout", naira(pendingSum)],
        ].map(([l, v]) => (
          <div key={l} className="panel p-5">
            <div className="text-xs text-muted mb-1.5">{l}</div>
            <div className="text-2xl font-black text-gold">{v}</div>
          </div>
        ))}
      </div>

      <div className="panel p-6">
        <h3 className="font-bold text-white mb-4">
          Payout requests waiting <span className="text-sm font-normal text-muted">({pendingList.length})</span>
        </h3>
        {pendingList.length === 0 ? (
          <p className="text-sm text-muted">Nothing waiting.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted border-b border-white/10">
                  <th className="pb-2.5 font-semibold">Affiliate</th>
                  <th className="pb-2.5 font-semibold">Amount</th>
                  <th className="pb-2.5 font-semibold">Pay to</th>
                  <th className="pb-2.5 font-semibold">Date</th>
                  <th className="pb-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {pendingList.map((p) => (
                  <tr key={p.id} className="border-b border-white/5 last:border-0 align-top">
                    <td className="py-3">
                      <div className="text-white">{p.affiliates?.full_name || "-"}</div>
                      <div className="text-xs text-muted font-mono">{p.affiliates?.code}</div>
                    </td>
                    <td className="py-3 text-gold font-bold">{naira(p.amount)}</td>
                    <td className="py-3 text-muted">
                      <div className="text-white">{p.account_name}</div>
                      <div>{p.bank_name} {p.account_number}</div>
                    </td>
                    <td className="py-3 text-muted whitespace-nowrap">{dateShort(p.created_at)}</td>
                    <td className="py-3 text-right whitespace-nowrap">
                      <button onClick={() => mark(p.id, "paid")} className="text-mint font-semibold text-sm mr-4">Mark paid</button>
                      <button onClick={() => mark(p.id, "rejected")} className="text-red-400 text-sm">Reject</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="panel p-6 space-y-4">
        <h3 className="font-bold text-white">All affiliates</h3>
        <input className="field" placeholder="Search by name or code" value={q} onChange={(e) => setQ(e.target.value)} />
        {shown.length === 0 ? (
          <p className="text-sm text-muted">No affiliates yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted border-b border-white/10">
                  <th className="pb-2.5 font-semibold">Name</th>
                  <th className="pb-2.5 font-semibold">Code</th>
                  <th className="pb-2.5 font-semibold">Joined</th>
                  <th className="pb-2.5 font-semibold">Clicks</th>
                  <th className="pb-2.5 font-semibold">Sales</th>
                  <th className="pb-2.5 font-semibold">Earned</th>
                  <th className="pb-2.5 font-semibold">Unpaid</th>
                  <th className="pb-2.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((a) => (
                  <tr key={a.id} className="border-b border-white/5 last:border-0">
                    <td className="py-3">
                      <div className="text-white">{a.full_name || "-"}</div>
                      <div className="text-xs text-muted">{a.phone || ""}</div>
                    </td>
                    <td className="py-3 font-mono text-gold">{a.code}</td>
                    <td className="py-3 text-muted whitespace-nowrap">
                      {dateShort(a.created_at)}
                      <div className="text-xs">{a.source === "paid" ? "Paid fee" : "Free window"}</div>
                    </td>
                    <td className="py-3 text-muted">{a.clicks || 0}</td>
                    <td className="py-3 text-white">{a.sales_count || 0}</td>
                    <td className="py-3 text-white">{naira(a.total_earned)}</td>
                    <td className="py-3 text-gold font-semibold">{naira(Number(a.total_earned) - Number(a.total_paid))}</td>
                    <td className="py-3">
                      <button onClick={() => toggle(a)}
                        className={"chip " + (a.is_active ? "bg-mint/15 text-mint" : "bg-red-500/15 text-red-300")}>
                        {a.is_active ? "Active" : "Paused"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
