import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import CourseCard from "../components/CourseCard";

export default function Home() {
  const [courses, setCourses] = useState([]);
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: c }, { data: k }] = await Promise.all([
        supabase
          .from("courses")
          .select("*")
          .eq("is_published", true)
          .order("sort_order")
          .limit(8),
        supabase.from("categories").select("*").order("sort_order"),
      ]);
      setCourses(c || []);
      setCats(k || []);
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <section className="border-b border-gold/15 bg-gradient-to-br from-gold/[0.06] via-transparent to-mint/[0.04]">
        <div className="max-w-5xl mx-auto px-5 py-20 md:py-28 text-center">
          <div className="inline-block chip bg-gold/12 border border-gold/30 text-gold mb-5">
            Practical income skills for Nigerians
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white leading-[1.1] mb-5">
            Learn Real Skills.<br />
            <span className="text-gold">Earn Real Income.</span>
          </h1>
          <p className="text-muted text-lg max-w-xl mx-auto mb-9">
            Step by step courses that teach you a skill you can actually make
            money with. Pay once, keep access forever.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link to="/courses" className="btn-gold">Browse all courses</Link>
            <Link to="/register" className="btn-ghost">Create free account</Link>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-5 py-14">
        <div className="flex items-end justify-between mb-7 gap-4">
          <div>
            <div className="text-[11px] font-bold text-gold tracking-widest uppercase mb-1">
              Popular right now
            </div>
            <h2 className="text-2xl font-black text-white">Featured Courses</h2>
          </div>
          <Link to="/courses" className="text-sm text-gold hover:underline shrink-0">
            View all
          </Link>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="panel h-72 animate-pulse bg-white/[0.03]" />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="panel p-12 text-center">
            <p className="text-muted">No courses published yet.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {courses.map((c) => <CourseCard key={c.id} c={c} />)}
          </div>
        )}
      </section>

      {cats.length > 0 && (
        <section className="max-w-6xl mx-auto px-5 pb-16">
          <h2 className="text-2xl font-black text-white mb-6">Browse by category</h2>
          <div className="flex flex-wrap gap-3">
            {cats.map((k) => (
              <Link
                key={k.id}
                to={"/courses?cat=" + k.slug}
                className="panel px-5 py-3 hover:border-gold/40 transition text-sm font-semibold"
              >
                {k.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="max-w-6xl mx-auto px-5 pb-20">
        <div className="grid md:grid-cols-3 gap-5">
          {[
            ["Pay once", "No subscriptions. Buy a course and it stays yours forever."],
            ["Instant access", "Payment confirms in seconds and the course opens immediately."],
            ["Built for Nigeria", "Pay with your card, bank transfer or USSD through Flutterwave."],
          ].map(([t, d]) => (
            <div key={t} className="panel p-6">
              <h3 className="font-bold text-white mb-2">{t}</h3>
              <p className="text-sm text-muted leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
