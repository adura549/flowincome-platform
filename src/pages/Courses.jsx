import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import CourseCard from "../components/CourseCard";

export default function Courses() {
  const [params, setParams] = useSearchParams();
  const activeCat = params.get("cat") || "all";
  const [q, setQ] = useState("");

  const [courses, setCourses] = useState([]);
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: c }, { data: k }] = await Promise.all([
        supabase.from("courses").select("*").eq("is_published", true).order("sort_order"),
        supabase.from("categories").select("*").order("sort_order"),
      ]);
      setCourses(c || []);
      setCats(k || []);
      setLoading(false);
    })();
  }, []);

  const catMap = Object.fromEntries(cats.map((k) => [k.id, k.slug]));

  const shown = courses.filter((c) => {
    const okCat = activeCat === "all" || catMap[c.category_id] === activeCat;
    const okQ =
      !q ||
      c.title.toLowerCase().includes(q.toLowerCase()) ||
      (c.short_desc || "").toLowerCase().includes(q.toLowerCase());
    return okCat && okQ;
  });

  function setCat(slug) {
    if (slug === "all") setParams({});
    else setParams({ cat: slug });
  }

  return (
    <div className="max-w-6xl mx-auto px-5 py-12">
      <h1 className="text-3xl font-black text-white mb-2">All Courses</h1>
      <p className="text-muted mb-8">
        {loading ? "Loading..." : shown.length + " course" + (shown.length === 1 ? "" : "s") + " available"}
      </p>

      <input
        className="field mb-5"
        placeholder="Search courses..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      <div className="flex gap-2 flex-wrap mb-9 pb-5 border-b border-white/5">
        <button
          onClick={() => setCat("all")}
          className={
            "px-4 py-2 rounded-full text-sm font-semibold border transition " +
            (activeCat === "all"
              ? "bg-gold text-black border-gold"
              : "border-white/10 text-muted hover:text-white")
          }
        >
          All
        </button>
        {cats.map((k) => (
          <button
            key={k.id}
            onClick={() => setCat(k.slug)}
            className={
              "px-4 py-2 rounded-full text-sm font-semibold border transition " +
              (activeCat === k.slug
                ? "bg-gold text-black border-gold"
                : "border-white/10 text-muted hover:text-white")
            }
          >
            {k.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="panel h-72 animate-pulse bg-white/[0.03]" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <div className="panel p-16 text-center">
          <p className="text-muted">No courses match that filter.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {shown.map((c) => <CourseCard key={c.id} c={c} />)}
        </div>
      )}
    </div>
  );
}
