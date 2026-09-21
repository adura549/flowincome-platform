import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { naira, dateShort } from "../../lib/format";

export default function AdminOrders() {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, courses(title)")
        .order("created_at", { ascending: false })
        .limit(200);
      setRows(data || []);
      setLoading(false);
    })();
  }, []);

  const shown = filter === "all" ? rows : rows.filter((o) => o.status === filter);
  const revenue = rows.filter((o) => o.status === "paid")
    .reduce((a, o) => a + Number(o.amount || 0), 0);

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
                <th className="p-4 font-semibold">Course</th>
                <th className="p-4 font-semibold">Amount</th>
                <th className="p-4 font-semibold">Reference</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((o) => (
                <tr key={o.id} className="border-b border-white/5 last:border-0">
                  <td className="p-4">
                    <div className="text-white">{o.full_name || "-"}</div>
                    <div className="text-xs text-muted">{o.email}</div>
                  </td>
                  <td className="p-4 text-muted">{o.courses?.title || "-"}</td>
                  <td className="p-4 text-gold font-semibold">{naira(o.amount)}</td>
                  <td className="p-4 text-xs text-white/30 font-mono">{o.tx_ref}</td>
                  <td className="p-4">
                    <span className={"chip " + (o.status === "paid"
                      ? "bg-mint/15 text-mint"
                      : o.status === "failed"
                      ? "bg-red-500/15 text-red-300"
                      : "bg-white/10 text-muted")}>
                      {o.status}
                    </span>
                  </td>
                  <td className="p-4 text-muted whitespace-nowrap">{dateShort(o.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
