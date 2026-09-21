import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { dateShort } from "../../lib/format";

export default function AdminStudents() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("profiles").select("*")
        .order("created_at", { ascending: false }).limit(300);
      setRows(data || []);
      setLoading(false);
    })();
  }, []);

  const shown = rows.filter((r) =>
    !q ||
    (r.full_name || "").toLowerCase().includes(q.toLowerCase()) ||
    (r.email || "").toLowerCase().includes(q.toLowerCase())
  );

  async function makeAdmin(r) {
    if (!confirm("Give admin access to " + (r.full_name || r.email) + "?")) return;
    await supabase.from("profiles").update({ role: "admin" }).eq("id", r.id);
    setRows(rows.map((x) => (x.id === r.id ? { ...x, role: "admin" } : x)));
  }

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-black text-white">
        Students <span className="text-sm font-normal text-muted">({rows.length})</span>
      </h2>

      <input className="field" placeholder="Search by name or email"
        value={q} onChange={(e) => setQ(e.target.value)} />

      {loading ? (
        <div className="panel p-10 text-center text-muted">Loading...</div>
      ) : (
        <div className="panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted border-b border-white/10">
                <th className="p-4 font-semibold">Name</th>
                <th className="p-4 font-semibold">Email</th>
                <th className="p-4 font-semibold">Phone</th>
                <th className="p-4 font-semibold">Role</th>
                <th className="p-4 font-semibold">Joined</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className="border-b border-white/5 last:border-0">
                  <td className="p-4 text-white">{r.full_name || "-"}</td>
                  <td className="p-4 text-muted">{r.email}</td>
                  <td className="p-4 text-muted">{r.phone || "-"}</td>
                  <td className="p-4">
                    <span className={"chip " + (r.role === "admin"
                      ? "bg-gold/15 text-gold" : "bg-white/10 text-muted")}>
                      {r.role}
                    </span>
                  </td>
                  <td className="p-4 text-muted whitespace-nowrap">{dateShort(r.created_at)}</td>
                  <td className="p-4 text-right">
                    {r.role !== "admin" && (
                      <button onClick={() => makeAdmin(r)}
                        className="text-xs text-gold hover:underline">Make admin</button>
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
