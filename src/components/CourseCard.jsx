import { Link } from "react-router-dom";
import { naira } from "../lib/format";

export default function CourseCard({ c }) {
  return (
    <Link
      to={"/course/" + c.slug}
      className="panel overflow-hidden flex flex-col hover:border-gold/40 hover:-translate-y-1 transition group"
    >
      <div className="aspect-video bg-gradient-to-br from-gold/10 to-transparent grid place-items-center overflow-hidden">
        {c.thumbnail_url ? (
          <img src={c.thumbnail_url} alt={c.title} className="w-full h-full object-cover" />
        ) : (
          <span className="text-5xl opacity-60">{c.emoji || "\ud83d\udcd8"}</span>
        )}
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <div className="flex gap-2 mb-2 flex-wrap">
          <span className="chip bg-blue-500/15 text-blue-300">{c.level || "Beginner"}</span>
          {c.is_free && <span className="chip bg-mint/15 text-mint">Free</span>}
          {c.is_featured && <span className="chip bg-gold/15 text-gold">Popular</span>}
        </div>

        <h3 className="font-bold text-white leading-snug mb-1.5 group-hover:text-gold transition">
          {c.title}
        </h3>
        <p className="text-sm text-muted line-clamp-2 flex-1">{c.short_desc}</p>

        <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
          <div>
            {c.is_free ? (
              <span className="text-lg font-black text-mint">Free</span>
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-black text-gold">{naira(c.price_ngn)}</span>
                {c.compare_price > c.price_ngn && (
                  <span className="text-xs text-white/30 line-through">{naira(c.compare_price)}</span>
                )}
              </div>
            )}
          </div>
          <span className="text-xs text-muted">{c.lesson_count || 0} lessons</span>
        </div>
      </div>
    </Link>
  );
}
