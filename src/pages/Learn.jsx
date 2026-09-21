import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

export default function Learn() {
  const { slug } = useParams();
  const { user } = useAuth();

  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [done, setDone] = useState(new Set());
  const [active, setActive] = useState(0);
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cert, setCert] = useState(null);
  const [certErr, setCertErr] = useState("");
  const [certBusy, setCertBusy] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);

      const { data: c } = await supabase
        .from("courses").select("*").eq("slug", slug).maybeSingle();
      if (!c) { setLoading(false); return; }
      setCourse(c);

      const { data: e } = await supabase
        .from("enrollments").select("id")
        .eq("user_id", user.id).eq("course_id", c.id).maybeSingle();

      if (!e) { setAllowed(false); setLoading(false); return; }
      setAllowed(true);

      const [{ data: ls }, { data: pr }] = await Promise.all([
        supabase.from("lessons").select("*").eq("course_id", c.id).order("sort_order"),
        supabase.from("lesson_progress").select("lesson_id").eq("user_id", user.id).eq("course_id", c.id),
      ]);

      setLessons(ls || []);
      setDone(new Set((pr || []).map((p) => p.lesson_id)));

      const { data: ce } = await supabase
        .from("certificates").select("code")
        .eq("user_id", user.id).eq("course_id", c.id).maybeSingle();
      setCert(ce?.code || null);
      setLoading(false);
    })();
  }, [slug, user]);

  async function markDone(lesson) {
    if (done.has(lesson.id)) return;
    setDone(new Set([...done, lesson.id]));
    await supabase.from("lesson_progress").insert({
      user_id: user.id,
      lesson_id: lesson.id,
      course_id: course.id,
    });
  }

  async function claimCert() {
    setCertErr(""); setCertBusy(true);
    const { data, error } = await supabase.rpc("claim_certificate", { p_course: course.id });
    setCertBusy(false);
    if (error) return setCertErr(error.message);
    nav("/verify/" + data);
  }

  if (loading) {
    return <div className="max-w-6xl mx-auto px-5 py-24 text-center text-muted">Loading your course...</div>;
  }

  if (!course) {
    return (
      <div className="max-w-md mx-auto px-5 py-24 text-center">
        <h1 className="text-2xl font-black text-white mb-3">Course not found</h1>
        <Link to="/courses" className="btn-gold inline-block">Browse courses</Link>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="max-w-md mx-auto px-5 py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-white/5 grid place-items-center mx-auto mb-5 text-3xl">
          {"\ud83d\udd12"}
        </div>
        <h1 className="text-2xl font-black text-white mb-3">You do not have access yet</h1>
        <p className="text-muted mb-7">
          Enrol in this course to unlock every lesson.
        </p>
        <Link to={"/course/" + slug} className="btn-gold inline-block">
          View course and enrol
        </Link>
      </div>
    );
  }

  const linkTypes = ["drive", "telegram", "whatsapp", "external"];
  const isLinkOnly = linkTypes.includes(course.access_type) && lessons.length === 0;
  const hasLinkAndLessons = course.access_url && lessons.length > 0;

  const defaultLabel = {
    drive: "Open the course folder",
    telegram: "Join the Telegram group",
    whatsapp: "Join the WhatsApp group",
    external: "Open course access",
    legacy: "Open course",
  }[course.access_type] || "Open course access";

  // Link only delivery
  if (isLinkOnly) {
    return (
      <div className="max-w-xl mx-auto px-5 py-24 text-center">
        <div className="text-6xl mb-6">{course.emoji || "\ud83c\udf93"}</div>
        <h1 className="text-2xl font-black text-white mb-3">{course.title}</h1>
        <p className="text-muted mb-2">Your access is active.</p>
        {course.access_note && (
          <div className="panel p-5 text-sm text-muted my-6 text-left leading-relaxed whitespace-pre-wrap">
            {course.access_note}
          </div>
        )}
        {course.access_url ? (
          <a href={course.access_url} target="_blank" rel="noreferrer"
             className="btn-gold inline-block mt-4">
            {course.access_button_label || defaultLabel}
          </a>
        ) : (
          <p className="text-sm text-red-300 mt-4">
            Access link not set yet. Please contact support.
          </p>
        )}
        {cert && (
          <div className="mt-6">
            <Link to={"/verify/" + cert} className="btn-ghost inline-block text-sm">
              View your certificate
            </Link>
          </div>
        )}
        <div className="mt-8">
          <Link to="/dashboard" className="text-sm text-muted hover:text-white">
            Back to my courses
          </Link>
        </div>
      </div>
    );
  }

  const L = lessons[active];
  const pct = lessons.length ? Math.round((done.size / lessons.length) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto px-5 py-8">
      <Link to="/dashboard" className="text-sm text-muted hover:text-white">
        Back to my courses
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap mt-3 mb-6">
        <h1 className="text-2xl font-black text-white">{course.title}</h1>
        {lessons.length > 0 && (
          <div className="text-sm text-muted">
            {done.size} of {lessons.length} complete
            <div className="w-40 h-1.5 bg-white/10 rounded-full mt-1.5 overflow-hidden">
              <div className="h-full bg-gold transition-all" style={{ width: pct + "%" }} />
            </div>
          </div>
        )}
      </div>

      {lessons.length > 0 && done.size >= lessons.length && (
        <div className="panel p-5 mb-6 border-mint/30 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="font-bold text-white">You finished the course</div>
            <div className="text-sm text-muted">Your certificate is ready. Anyone can verify it with its code or QR.</div>
            {certErr && <div className="text-sm text-red-400 mt-1">{certErr}</div>}
          </div>
          {cert ? (
            <Link to={"/verify/" + cert} className="btn-gold text-sm py-2 px-4 shrink-0">View certificate</Link>
          ) : (
            <button onClick={claimCert} disabled={certBusy} className="btn-gold text-sm py-2 px-4 shrink-0">
              {certBusy ? "Preparing..." : "Get your certificate"}
            </button>
          )}
        </div>
      )}

      {hasLinkAndLessons && (
        <div className="panel p-4 mb-6 flex items-center justify-between gap-4 flex-wrap border-gold/25">
          <div className="text-sm text-muted">
            {course.access_note || "This course also has a group or folder you can access."}
          </div>
          <a href={course.access_url} target="_blank" rel="noreferrer"
             className="btn-gold text-sm py-2 px-4 shrink-0">
            {course.access_button_label || defaultLabel}
          </a>
        </div>
      )}

      <div className="grid lg:grid-cols-4 gap-6">
        <aside className="lg:order-2">
          <div className="panel p-4 lg:sticky lg:top-24 max-h-[70vh] overflow-y-auto">
            <div className="text-xs font-bold text-gold uppercase tracking-wider mb-3 px-1">
              Lessons ({lessons.length})
            </div>
            <div className="space-y-1">
              {lessons.map((l, i) => (
                <button
                  key={l.id}
                  onClick={() => setActive(i)}
                  className={
                    "w-full text-left px-3 py-2.5 rounded-lg text-sm transition flex gap-2.5 items-start " +
                    (i === active ? "bg-gold/12 text-gold font-semibold" : "text-muted hover:bg-white/5")
                  }
                >
                  <span className="shrink-0 w-4">
                    {done.has(l.id) ? <span className="text-mint">{"\u2713"}</span> : i + 1 + "."}
                  </span>
                  <span className="flex-1 leading-snug">{l.title}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <div className="lg:col-span-3">
          {!L ? (
            <div className="panel p-16 text-center text-muted">
              Lessons are being added to this course.
            </div>
          ) : (
            <div className="panel p-7">
              <h2 className="text-xl font-bold text-white mb-5">{L.title}</h2>

              {L.content_type === "video" && L.content_url && (
                <div className="aspect-video rounded-xl overflow-hidden mb-6 bg-black">
                  <iframe src={L.content_url} title={L.title} allowFullScreen
                    className="w-full h-full" frameBorder="0" />
                </div>
              )}

              {["drive", "pdf", "telegram", "whatsapp", "external"].includes(L.content_type) && L.content_url && (
                <a href={L.content_url} target="_blank" rel="noreferrer"
                   className="btn-gold inline-block mb-6">
                  {L.content_type === "pdf" ? "Download the PDF"
                    : L.content_type === "drive" ? "Open in Google Drive"
                    : L.content_type === "telegram" ? "Open Telegram"
                    : L.content_type === "whatsapp" ? "Open WhatsApp"
                    : "Open link"}
                </a>
              )}

              {L.content && (
                <div
                  className="lesson-body text-muted leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: L.content }}
                />
              )}

              <div className="flex items-center justify-between gap-3 mt-8 pt-6 border-t border-white/5 flex-wrap">
                <button onClick={() => setActive(Math.max(0, active - 1))}
                  disabled={active === 0}
                  className="btn-ghost text-sm disabled:opacity-30">
                  Previous
                </button>

                <button
                  onClick={() => markDone(L)}
                  disabled={done.has(L.id)}
                  className="text-sm text-mint font-semibold disabled:opacity-40"
                >
                  {done.has(L.id) ? "Completed" : "Mark as complete"}
                </button>

                <button onClick={() => { markDone(L); setActive(Math.min(lessons.length - 1, active + 1)); }}
                  disabled={active === lessons.length - 1}
                  className="btn-gold text-sm disabled:opacity-30">
                  Next lesson
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
