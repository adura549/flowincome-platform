import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { dateShort } from "../lib/format";

export default function Dashboard() {
  const { user, profile } = useAuth();
  const [rows, setRows] = useState([]);
  const [certs, setCerts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("enrollments")
        .select("id, created_at, courses(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setRows(data || []);
      const { data: ce } = await supabase
        .from("certificates").select("code, course_id").eq("user_id", user.id);
      setCerts(Object.fromEntries((ce || []).map((x) => [x.course_id, x.code])));
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className="max-w-6xl mx-auto px-5 py-12">
      <h1 className="text-3xl font-black text-white mb-1">
        Hello{profile?.full_name ? ", " + profile.full_name.split(" ")[0] : ""}
      </h1>
      <p className="text-muted mb-9">
        {loading ? "Loading..." : rows.length + " course" + (rows.length === 1 ? "" : "s") + " in your account"}
      </p>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => <div key={i} className="panel h-56 animate-pulse bg-white/[0.03]" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="panel p-16 text-center">
          <h2 className="text-xl font-bold text-white mb-2">No courses yet</h2>
          <p className="text-muted mb-6">Pick a skill and start learning today.</p>
          <Link to="/courses" className="btn-gold inline-block">Browse courses</Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {rows.map((r) => {
            const c = r.courses;
            if (!c) return null;
            return (
              <div key={r.id} className="panel overflow-hidden flex flex-col">
                <div className="aspect-video bg-gradient-to-br from-gold/10 to-transparent grid place-items-center">
                  {c.thumbnail_url
                    ? <img src={c.thumbnail_url} alt="" className="w-full h-full object-cover" />
                    : <span className="text-5xl opacity-60">{c.emoji || "\ud83d\udcd8"}</span>}
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="font-bold text-white leading-snug mb-1">{c.title}</h3>
                  <p className="text-xs text-muted mb-4">Added {dateShort(r.created_at)}</p>
                  <Link to={"/learn/" + c.slug} className="btn-gold text-sm py-2.5 text-center mt-auto">
                    Open course
                  </Link>
                  {certs[c.id] && (
                    <Link to={"/verify/" + certs[c.id]} className="text-xs text-gold hover:underline text-center mt-3">
                      View certificate
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
