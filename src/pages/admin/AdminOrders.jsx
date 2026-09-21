import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { naira, dateShort } from "../../lib/format";

export default function AdminOrders() {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(null);
  const [note, setNote] = useState("");

  async function load() {
    const { data } = await supabase
      .from("orders").select("*, courses(title)")
      .order("created_at", { ascending: false }).limit(300);
    setRows(data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function recheck(o) {
    setChecking(o.id); setNote("");
    const { data: s } = await supabase.auth.getSession();
    try {
      const r = await fetch("/.netlify/functions/admin-recheck", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + (s?.session?.access_token || "") },
        body: JSON.stringify({ order_id: o.id }),
      });
      const j = await r.json();
      setNote(
        j.status === "paid" ? "Confirmed as paid. " + (o.full_name || o.email) + " now has access."
        : j.pending ? "Flutterwave has not confirmed this payment yet. Try again later."
        : j.error || "Status: " + j.status
      );
    } catch {
      setNote("Could not reach the server.");
    }
    setChecking(null);
    load();
  }

  const shown = filter === "all" ? rows : rows.filter((o) => o.status === filter);
  const revenue = rows.filter((o) => o.status === "paid").reduce((a, o) => a + Number(o.amount || 0), 0);
  const label = (o) => o.item_type === "affiliate_fee" ? "Affiliate sign up" : o.courses?.title || "-";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-xl font-black text-white">Orders</h2>
        <div className="text-sm text-muted">
          Total collected: <span className="text-gold font-bold">{naira(revenue)}</span>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {["all", "paid", "pending", "failed"].map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={"px-4 py-2 rounded-full text-sm font-semibold border transition " +
              (filter === s ? "bg-gold text-black border-gold" : "border-white/10 text-muted hover:text-white")}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <p className="text-xs text-white/30">
        If a student says they paid but have no access, find their order here and click Recheck.
        It asks Flutterwave directly and fixes the order if the money arrived.
      </p>

      {note && <div className="panel p-4 text-sm text-gold border-gold/30">{note}</div>}

      {loading ? (
        <div className="panel p-10 text-center text-muted">Loading...</div>
      ) : shown.length === 0 ? (
        <div className="panel p-14 text-center text-muted">No orders found.</div>
      ) : (
        <div className="panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted border-b border-white/10">
                <th className="p-4 font-semibold">Customer</th>
                <th className="p-4 font-semibold">Item</th>
                <th className="p-4 font-semibold">Amount</th>
                <th className="p-4 font-semibold">Reference</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold">Date</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((o) => (
                <tr key={o.id} className="border-b border-white/5 last:border-0">
                  <td className="p-4">
                    <div className="text-white">{o.full_name || "-"}</div>
                    <div className="text-xs text-muted">{o.email}</div>
                  </td>
                  <td className="p-4 text-muted">
                    {label(o)}
                    {o.ref_code && <div className="text-xs text-gold font-mono">ref {o.ref_code}</div>}
                  </td>
                  <td className="p-4 text-gold font-semibold">{naira(o.amount)}</td>
                  <td className="p-4 text-xs text-white/30 font-mono">{o.tx_ref}</td>
                  <td className="p-4">
                    <span className={"chip " + (o.status === "paid" ? "bg-mint/15 text-mint"
                      : o.status === "failed" ? "bg-red-500/15 text-red-300" : "bg-white/10 text-muted")}>
                      {o.status}
                    </span>
                  </td>
                  <td className="p-4 text-muted whitespace-nowrap">{dateShort(o.created_at)}</td>
                  <td className="p-4 text-right">
                    {o.status !== "paid" && Number(o.amount) > 0 && (
                      <button onClick={() => recheck(o)} disabled={checking === o.id}
                        className="text-xs text-gold hover:underline whitespace-nowrap disabled:opacity-50">
                        {checking === o.id ? "Checking..." : "Recheck"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
