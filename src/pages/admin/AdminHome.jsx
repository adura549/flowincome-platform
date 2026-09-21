import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { naira, dateShort } from "../../lib/format";

export default function AdminHome() {
  const [s, setS] = useState({ revenue: 0, orders: 0, students: 0, courses: 0, published: 0 });
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [orders, profiles, courses, latest] = await Promise.all([
        supabase.from("orders").select("amount,status").eq("status", "paid"),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("courses").select("id,is_published"),
        supabase.from("orders").select("*, courses(title)").order("created_at", { ascending: false }).limit(8),
      ]);

      const paid = orders.data || [];
      setS({
        revenue: paid.reduce((a, o) => a + Number(o.amount || 0), 0),
        orders: paid.length,
        students: profiles.count || 0,
        courses: courses.data?.length || 0,
        published: courses.data?.filter((c) => c.is_published).length || 0,
      });
      setRecent(latest.data || []);
      setLoading(false);
    })();
  }, []);

  const cards = [
    ["Total revenue", naira(s.revenue)],
    ["Paid orders", s.orders],
    ["Students", s.students],
    ["Courses live", s.published + " / " + s.courses],
  ];

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(([label, val]) => (
          <div key={label} className="panel p-5">
            <div className="text-xs text-muted mb-1.5">{label}</div>
            <div className="text-2xl font-black text-gold">{loading ? "..." : val}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap">
        <Link to="/admin/courses/new" className="btn-gold text-sm">Add new course</Link>
        <Link to="/admin/courses" className="btn-ghost text-sm">Manage courses</Link>
      </div>

      <div className="panel p-6">
        <h2 className="font-bold text-white mb-4">Recent orders</h2>
        {loading ? (
          <p className="text-muted text-sm">Loading...</p>
        ) : recent.length === 0 ? (
          <p className="text-muted text-sm">No orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted border-b border-white/10">
                  <th className="pb-2.5 font-semibold">Customer</th>
                  <th className="pb-2.5 font-semibold">Course</th>
                  <th className="pb-2.5 font-semibold">Amount</th>
                  <th className="pb-2.5 font-semibold">Status</th>
                  <th className="pb-2.5 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((o) => (
                  <tr key={o.id} className="border-b border-white/5 last:border-0">
                    <td className="py-3 text-white">{o.full_name || o.email}</td>
                    <td className="py-3 text-muted">{o.courses?.title || "-"}</td>
                    <td className="py-3 text-gold font-semibold">{naira(o.amount)}</td>
                    <td className="py-3">
                      <span className={"chip " + (o.status === "paid"
                        ? "bg-mint/15 text-mint"
                        : o.status === "failed"
                        ? "bg-red-500/15 text-red-300"
                        : "bg-white/10 text-muted")}>
                        {o.status}
                      </span>
                    </td>
                    <td className="py-3 text-muted">{dateShort(o.created_at)}</td>
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
