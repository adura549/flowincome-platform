import { Fragment, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { dateShort } from "../../lib/format";

export default function AdminStudents() {
  const [rows, setRows] = useState([]);
  const [courses, setCourses] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const [emails, setEmails] = useState("");
  const [courseId, setCourseId] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState([]);

  const [openId, setOpenId] = useState(null);
  const [enrolls, setEnrolls] = useState([]);

  async function load() {
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("courses").select("id,title").order("sort_order"),
    ]);
    setRows(p || []);
    setCourses(c || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function grant() {
    const list = emails.split(/[\s,;]+/).map((e) => e.trim()).filter(Boolean);
    if (!list.length || !courseId) return;
    setBusy(true);
    const out = [];
    for (const email of list) {
      const { error } = await supabase.rpc("admin_grant_access", { p_email: email, p_course: courseId });
      out.push({ email, ok: !error, msg: error ? error.message : "Access given" });
    }
    setResults(out);
    setBusy(false);
    if (openId) openStudent(openId);
  }

  async function openStudent(id) {
    if (openId === id) { setOpenId(null); return; }
    setOpenId(id);
    const { data } = await supabase
      .from("enrollments").select("id, course_id, source, created_at, courses(title)")
      .eq("user_id", id).order("created_at", { ascending: false });
    setEnrolls(data || []);
  }

  async function revoke(e) {
    if (!confirm("Remove access to " + (e.courses?.title || "this course") + "? Their certificate for it will also be removed.")) return;
    await supabase.from("enrollments").delete().eq("id", e.id);
    await supabase.from("certificates").delete().eq("user_id", openId).eq("course_id", e.course_id);
    setEnrolls(enrolls.filter((x) => x.id !== e.id));
  }

  async function makeAdmin(r) {
    if (!confirm("Give admin access to " + (r.full_name || r.email) + "? They will be able to see everything and change anything.")) return;
    await supabase.from("profiles").update({ role: "admin" }).eq("id", r.id);
    setRows(rows.map((x) => (x.id === r.id ? { ...x, role: "admin" } : x)));
  }

  const shown = rows.filter((r) =>
    !q ||
    (r.full_name || "").toLowerCase().includes(q.toLowerCase()) ||
    (r.email || "").toLowerCase().includes(q.toLowerCase()) ||
    (r.phone || "").includes(q)
  );

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-black text-white">
        Students <span className="text-sm font-normal text-muted">({rows.length})</span>
      </h2>

      {/* GRANT ACCESS */}
      <div className="panel p-6 space-y-4 border-gold/20">
        <div>
          <h3 className="font-bold text-white">Give a course to someone</h3>
          <p className="text-sm text-muted mt-1">
            For buyers from your old site, gifts, or fixing a payment. They must create an account first,
            using the same email you type here.
          </p>
        </div>

        <div>
          <label className="label">Their email (you can paste several, one per line)</label>
          <textarea className="field" rows={3} value={emails} onChange={(e) => setEmails(e.target.value)}
            placeholder={"ada@gmail.com\nemeka@yahoo.com"} />
        </div>

        <div>
          <label className="label">Course</label>
          <select className="field" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
            <option value="">Choose a course</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>

        <button onClick={grant} disabled={busy || !emails.trim() || !courseId} className="btn-gold text-sm">
          {busy ? "Giving access..." : "Give access"}
        </button>

        {results.length > 0 && (
          <div className="space-y-1.5 pt-2">
            {results.map((r, i) => (
              <div key={i} className={"text-sm " + (r.ok ? "text-mint" : "text-red-400")}>
                {r.email}: {r.msg}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* LIST */}
      <input className="field" placeholder="Search by name, email or phone" value={q} onChange={(e) => setQ(e.target.value)} />

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
                <Fragment key={r.id}>
                  <tr className="border-b border-white/5">
                    <td className="p-4 text-white">{r.full_name || "-"}</td>
                    <td className="p-4 text-muted">{r.email}</td>
                    <td className="p-4 text-muted">{r.phone || "-"}</td>
                    <td className="p-4">
                      <span className={"chip " + (r.role === "admin" ? "bg-gold/15 text-gold" : "bg-white/10 text-muted")}>{r.role}</span>
                    </td>
                    <td className="p-4 text-muted whitespace-nowrap">{dateShort(r.created_at)}</td>
                    <td className="p-4 text-right whitespace-nowrap">
                      <button onClick={() => openStudent(r.id)} className="text-xs text-gold hover:underline mr-4">
                        {openId === r.id ? "Close" : "Courses"}
                      </button>
                      {r.role !== "admin" && (
                        <button onClick={() => makeAdmin(r)} className="text-xs text-muted hover:text-white">Make admin</button>
                      )}
                    </td>
                  </tr>
                  {openId === r.id && (
                    <tr className="border-b border-white/5 bg-white/[0.02]">
                      <td colSpan={6} className="p-4">
                        {enrolls.length === 0 ? (
                          <span className="text-muted text-sm">No courses yet.</span>
                        ) : (
                          <div className="space-y-2">
                            {enrolls.map((e) => (
                              <div key={e.id} className="flex items-center justify-between gap-3">
                                <span className="text-white">{e.courses?.title || "Course"}</span>
                                <span className="text-xs text-muted">{e.source} · {dateShort(e.created_at)}</span>
                                <button onClick={() => revoke(e)} className="text-xs text-red-400 hover:underline">Remove</button>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
