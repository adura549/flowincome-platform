import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { naira } from "../../lib/format";

export default function AdminCourses() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [priceVal, setPriceVal] = useState("");

  async function load() {
    const { data } = await supabase.from("courses").select("*").order("sort_order");
    setRows(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function togglePublish(c) {
    await supabase.from("courses").update({ is_published: !c.is_published }).eq("id", c.id);
    load();
  }

  async function savePrice(c) {
    await supabase.from("courses")
      .update({ price_ngn: Number(priceVal || 0) })
      .eq("id", c.id);
    setEditing(null);
    load();
  }

  async function remove(c) {
    if (!confirm("Delete " + c.title + "? This cannot be undone.")) return;
    await supabase.from("courses").delete().eq("id", c.id);
    load();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-black text-white">
          Courses <span className="text-sm font-normal text-muted">({rows.length})</span>
        </h2>
        <Link to="/admin/courses/new" className="btn-gold text-sm">Add course</Link>
      </div>

      {loading ? (
        <div className="panel p-10 text-center text-muted">Loading...</div>
      ) : rows.length === 0 ? (
        <div className="panel p-14 text-center">
          <p className="text-muted mb-5">No courses yet.</p>
          <Link to="/admin/courses/new" className="btn-gold inline-block">Create your first course</Link>
        </div>
      ) : (
        <div className="panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted border-b border-white/10">
                <th className="p-4 font-semibold">Course</th>
                <th className="p-4 font-semibold">Price</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-b border-white/5 last:border-0">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{c.emoji || "\ud83d\udcd8"}</span>
                      <div className="min-w-0">
                        <div className="text-white font-medium leading-snug">{c.title}</div>
                        <div className="text-xs text-muted">/{c.slug}</div>
                      </div>
                    </div>
                  </td>

                  <td className="p-4">
                    {editing === c.id ? (
                      <div className="flex gap-1.5">
                        <input
                          className="field py-1.5 px-2 w-28 text-sm"
                          value={priceVal}
                          autoFocus
                          onChange={(e) => setPriceVal(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && savePrice(c)}
                        />
                        <button onClick={() => savePrice(c)}
                          className="text-xs text-mint font-bold px-2">Save</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditing(c.id); setPriceVal(c.price_ngn); }}
                        className="text-gold font-semibold hover:underline"
                      >
                        {c.is_free ? "Free" : naira(c.price_ngn)}
                      </button>
                    )}
                  </td>

                  <td className="p-4">
                    <button
                      onClick={() => togglePublish(c)}
                      className={"chip " + (c.is_published
                        ? "bg-mint/15 text-mint"
                        : "bg-white/10 text-muted")}
                    >
                      {c.is_published ? "Live" : "Draft"}
                    </button>
                  </td>

                  <td className="p-4 text-right whitespace-nowrap">
                    <Link to={"/admin/courses/" + c.id}
                      className="text-sm text-gold hover:underline mr-4">Edit</Link>
                    <button onClick={() => remove(c)}
                      className="text-sm text-red-400 hover:underline">Delete</button>
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
