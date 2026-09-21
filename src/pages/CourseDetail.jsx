import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { naira } from "../lib/format";
import { toEmbed } from "../lib/video";

export default function CourseDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();

  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [owned, setOwned] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: c } = await supabase
        .from("courses")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();

      if (!c) { setLoading(false); return; }
      setCourse(c);

      const { data: ls } = await supabase
        .from("lessons")
        .select("id,title,duration_min,is_preview,sort_order")
        .eq("course_id", c.id)
        .order("sort_order");
      setLessons(ls || []);

      if (user) {
        const { data: e } = await supabase
          .from("enrollments")
          .select("id")
          .eq("user_id", user.id)
          .eq("course_id", c.id)
          .maybeSingle();
        setOwned(!!e);
      }
      setLoading(false);
    })();
  }, [slug, user]);

  async function claimFree() {
    if (!user) return nav("/login?next=/course/" + slug);
    const { error } = await supabase.rpc("claim_free_course", { p_course: course.id });
    if (error) { alert(error.message); return; }
    nav("/learn/" + slug);
  }

  if (loading) {
    return <div className="max-w-6xl mx-auto px-5 py-24 text-center text-muted">Loading course...</div>;
  }

  if (!course) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-24 text-center">
        <h1 className="text-2xl font-black text-white mb-3">Course not found</h1>
        <Link to="/courses" className="btn-gold inline-block">Browse all courses</Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-5 py-10">
      <Link to="/courses" className="text-sm text-muted hover:text-white">
        Back to all courses
      </Link>

      <div className="grid lg:grid-cols-3 gap-8 mt-6">
        {/* LEFT: description */}
        <div className="lg:col-span-2 space-y-8">
          <div>
            <div className="flex gap-2 flex-wrap mb-4">
              <span className="chip bg-blue-500/15 text-blue-300">{course.level}</span>
              {course.duration_text && (
                <span className="chip bg-white/5 text-muted">{course.duration_text}</span>
              )}
              {course.is_free && <span className="chip bg-mint/15 text-mint">Free</span>}
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white leading-tight mb-4">
              {course.title}
            </h1>
            <p className="text-lg text-muted leading-relaxed">{course.short_desc}</p>
          </div>

          {(() => {
            const v = toEmbed(course.promo_video_url);
            if (!v) return null;
            return (
              <div className={v.vertical ? "max-w-sm mx-auto" : ""}>
                <div className={"rounded-2xl overflow-hidden bg-black border border-white/10 " + (v.vertical ? "aspect-[9/16]" : "aspect-video")}>
                  <iframe
                    src={v.src}
                    title="Course preview"
                    className="w-full h-full"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            );
          })()}

          {course.what_you_learn?.length > 0 && (
            <div className="panel p-6">
              <h2 className="text-xl font-bold text-white mb-4">What you will learn</h2>
              <ul className="grid sm:grid-cols-2 gap-3">
                {course.what_you_learn.map((it, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-muted">
                    <span className="text-mint font-bold shrink-0">+</span>
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {course.full_desc && (
            <div className="panel p-6">
              <h2 className="text-xl font-bold text-white mb-4">About this course</h2>
              <div className="text-muted leading-relaxed whitespace-pre-wrap">
                {course.full_desc}
              </div>
            </div>
          )}

          {course.requirements?.length > 0 && (
            <div className="panel p-6">
              <h2 className="text-xl font-bold text-white mb-4">Requirements</h2>
              <ul className="space-y-2">
                {course.requirements.map((r, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-muted">
                    <span className="text-gold shrink-0">-</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {lessons.length > 0 && (
            <div className="panel p-6">
              <h2 className="text-xl font-bold text-white mb-4">
                Course content <span className="text-sm font-normal text-muted">({lessons.length} lessons)</span>
              </h2>
              <div className="space-y-1">
                {lessons.map((l, i) => (
                  <div
                    key={l.id}
                    className="flex items-center gap-3 py-3 border-b border-white/5 last:border-0"
                  >
                    <span className="w-7 h-7 rounded-full bg-white/5 grid place-items-center text-xs font-bold text-muted shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-sm text-white flex-1">{l.title}</span>
                    {l.is_preview && <span className="chip bg-mint/15 text-mint">Preview</span>}
                    {l.duration_min && (
                      <span className="text-xs text-muted shrink-0">{l.duration_min} min</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: sticky checkout */}
        <div>
          <div className="panel p-6 lg:sticky lg:top-24">
            <div className="aspect-video rounded-xl bg-gradient-to-br from-gold/15 to-transparent grid place-items-center mb-5 overflow-hidden">
              {course.thumbnail_url ? (
                <img src={course.thumbnail_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-6xl opacity-60">{course.emoji || "\ud83d\udcd8"}</span>
              )}
            </div>

            {course.is_free ? (
              <div className="text-3xl font-black text-mint mb-1">Free</div>
            ) : (
              <div className="flex items-baseline gap-3 mb-1">
                <span className="text-3xl font-black text-gold">{naira(course.price_ngn)}</span>
                {course.compare_price > course.price_ngn && (
                  <span className="text-sm text-white/30 line-through">
                    {naira(course.compare_price)}
                  </span>
                )}
              </div>
            )}
            <p className="text-xs text-muted mb-5">One payment. Lifetime access.</p>

            {owned ? (
              <Link to={"/learn/" + course.slug} className="btn-gold w-full block text-center">
                Continue learning
              </Link>
            ) : course.is_free ? (
              <button onClick={claimFree} className="btn-gold w-full">
                Get free access
              </button>
            ) : (
              <Link to={"/checkout/" + course.slug} className="btn-gold w-full block text-center">
                Enrol now
              </Link>
            )}

            {!user && !owned && (
              <p className="text-xs text-muted text-center mt-3">
                <Link to="/login" className="text-gold hover:underline">Sign in</Link> if you already have an account
              </p>
            )}

            <div className="mt-6 pt-5 border-t border-white/5 space-y-2.5 text-sm text-muted">
              <Row label="Lessons" value={lessons.length || course.lesson_count || "-"} />
              <Row label="Level" value={course.level} />
              {course.duration_text && <Row label="Duration" value={course.duration_text} />}
              <Row label="Access" value="Lifetime" />
              <Row label="Certificate" value="Included" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span className="text-white font-medium">{value}</span>
    </div>
  );
}
