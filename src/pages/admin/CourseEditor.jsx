import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { slugify } from "../../lib/format";

const BLANK = {
  title: "", slug: "", short_desc: "", full_desc: "",
  what_you_learn: "", requirements: "",
  price_ngn: 0, compare_price: 0, emoji: "",
  thumbnail_url: "", promo_video_url: "", category_id: "", level: "Beginner",
  duration_text: "", lesson_count: 0,
  access_type: "lessons", access_url: "", access_note: "", access_button_label: "",
  legacy_file: "", legacy_code: "",
  is_published: false, is_featured: false, is_free: false, sort_order: 0,
};

const ACCESS_TYPES = [
  ["lessons",  "Lessons inside the platform", "Most secure. Content cannot be shared or leaked."],
  ["mixed",    "Lessons plus a group link",   "Lessons on the platform and a button to your group."],
  ["telegram", "Telegram group only",         "Student gets a button that opens your private Telegram group."],
  ["whatsapp", "WhatsApp group only",         "Student gets a button that opens your WhatsApp group."],
  ["drive",    "Google Drive folder only",    "Student gets a button that opens your Drive folder."],
  ["external", "Any other link",              "Zoom, Notion, Loom, anything else."],
];

export default function CourseEditor() {
  const { id } = useParams();
  const nav = useNavigate();
  const isNew = !id;

  const [f, setF] = useState(BLANK);
  const [cats, setCats] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [tab, setTab] = useState("details");

  useEffect(() => {
    (async () => {
      const { data: k } = await supabase.from("categories").select("*").order("sort_order");
      setCats(k || []);

      if (!isNew) {
        const { data: c } = await supabase.from("courses").select("*").eq("id", id).maybeSingle();
        if (c) {
          setF({
            ...BLANK,
            ...c,
            what_you_learn: (c.what_you_learn || []).join("\n"),
            requirements: (c.requirements || []).join("\n"),
            category_id: c.category_id || "",
            access_type: c.access_type || "lessons",
            access_url: c.access_url || "",
            access_note: c.access_note || "",
            access_button_label: c.access_button_label || "",
            promo_video_url: c.promo_video_url || "",
          });
        }
        const { data: ls } = await supabase
          .from("lessons").select("*").eq("course_id", id).order("sort_order");
        setLessons(ls || []);
      }
    })();
  }, [id, isNew]);

  function set(k, v) { setF((p) => ({ ...p, [k]: v })); }

  async function save() {
    if (!f.title) { setMsg("Give the course a title first."); return; }
    setBusy(true); setMsg("");

    const payload = {
      title: f.title,
      slug: f.slug || slugify(f.title),
      short_desc: f.short_desc,
      full_desc: f.full_desc,
      what_you_learn: f.what_you_learn ? f.what_you_learn.split("\n").filter(Boolean) : [],
      requirements: f.requirements ? f.requirements.split("\n").filter(Boolean) : [],
      price_ngn: Number(f.price_ngn || 0),
      compare_price: Number(f.compare_price || 0) || null,
      emoji: f.emoji || null,
      thumbnail_url: f.thumbnail_url || null,
      promo_video_url: f.promo_video_url || null,
      category_id: f.category_id || null,
      level: f.level,
      duration_text: f.duration_text || null,
      lesson_count: Number(f.lesson_count || 0),
      access_type: f.access_type,
      access_url: f.access_url || null,
      access_note: f.access_note || null,
      access_button_label: f.access_button_label || null,
      legacy_file: f.legacy_file || null,
      legacy_code: f.legacy_code || null,
      is_published: f.is_published,
      is_featured: f.is_featured,
      is_free: f.is_free,
      sort_order: Number(f.sort_order || 0),
      updated_at: new Date().toISOString(),
    };

    let err;
    if (isNew) {
      const r = await supabase.from("courses").insert(payload).select().single();
      err = r.error;
      if (!err) { nav("/admin/courses/" + r.data.id); setMsg("Course created."); }
    } else {
      const r = await supabase.from("courses").update(payload).eq("id", id);
      err = r.error;
      if (!err) setMsg("Saved.");
    }

    setBusy(false);
    if (err) setMsg("Error: " + err.message);
    setTimeout(() => setMsg(""), 4000);
  }

  async function addLesson() {
    const { data } = await supabase.from("lessons").insert({
      course_id: id,
      title: "New lesson",
      content_type: "text",
      sort_order: lessons.length,
    }).select().single();
    if (data) setLessons([...lessons, data]);
  }

  async function updLesson(lid, patch) {
    setLessons(lessons.map((l) => (l.id === lid ? { ...l, ...patch } : l)));
    await supabase.from("lessons").update(patch).eq("id", lid);
  }

  async function delLesson(lid) {
    if (!confirm("Delete this lesson?")) return;
    await supabase.from("lessons").delete().eq("id", lid);
    setLessons(lessons.filter((l) => l.id !== lid));
  }

  const needsLink = ["telegram", "whatsapp", "drive", "external", "mixed"].includes(f.access_type);
  const needsLessons = ["lessons", "mixed"].includes(f.access_type);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <Link to="/admin/courses" className="text-sm text-muted hover:text-white">
            Back to courses
          </Link>
          <h2 className="text-xl font-black text-white mt-1">
            {isNew ? "New course" : f.title || "Edit course"}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          {msg && (
            <span className={"text-sm " + (msg.startsWith("Error") ? "text-red-400" : "text-mint")}>
              {msg}
            </span>
          )}
          <button onClick={save} disabled={busy} className="btn-gold text-sm">
            {busy ? "Saving..." : "Save course"}
          </button>
        </div>
      </div>

      {!isNew && (
        <div className="flex gap-2 border-b border-white/10">
          {["details", "lessons"].map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={"px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition " +
                (tab === t ? "border-gold text-gold" : "border-transparent text-muted hover:text-white")}>
              {t === "details" ? "Course details" : "Lessons (" + lessons.length + ")"}
            </button>
          ))}
        </div>
      )}

      {tab === "details" && (
        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">

            <div className="panel p-6 space-y-4">
              <h3 className="font-bold text-white">Basic information</h3>
              <Field label="Course title">
                <input className="field" value={f.title}
                  onChange={(e) => { set("title", e.target.value); if (isNew) set("slug", slugify(e.target.value)); }} />
              </Field>
              <Field label="URL slug" hint="Becomes flowincome.site/course/your-slug">
                <input className="field" value={f.slug} onChange={(e) => set("slug", slugify(e.target.value))} />
              </Field>
              <Field label="Short description" hint="One or two lines. Shown on the course card.">
                <textarea className="field" rows={2} value={f.short_desc}
                  onChange={(e) => set("short_desc", e.target.value)} />
              </Field>
              <Field label="Promo video link" hint="YouTube or TikTok link. It plays on the course sales page, under the title.">
                <input className="field" value={f.promo_video_url}
                  onChange={(e) => set("promo_video_url", e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=... or https://www.tiktok.com/@you/video/..." />
              </Field>
              <Field label="Full description" hint="Shown on the course sales page.">
                <textarea className="field" rows={7} value={f.full_desc}
                  onChange={(e) => set("full_desc", e.target.value)} />
              </Field>
            </div>

            {/* DELIVERY */}
            <div className="panel p-6 space-y-4 border-gold/20">
              <div>
                <h3 className="font-bold text-white">How students get this course</h3>
                <p className="text-xs text-muted mt-1">
                  This decides what happens after someone pays.
                </p>
              </div>

              <div className="space-y-2">
                {ACCESS_TYPES.map(([val, label, hint]) => (
                  <label key={val}
                    className={"flex gap-3 p-3.5 rounded-xl border cursor-pointer transition " +
                      (f.access_type === val
                        ? "border-gold/50 bg-gold/[0.06]"
                        : "border-white/10 hover:border-white/20")}>
                    <input type="radio" name="atype" value={val}
                      checked={f.access_type === val}
                      onChange={() => set("access_type", val)}
                      className="mt-1 accent-gold shrink-0" />
                    <div>
                      <div className="text-sm font-semibold text-white">{label}</div>
                      <div className="text-xs text-muted mt-0.5">{hint}</div>
                    </div>
                  </label>
                ))}
              </div>

              {needsLink && (
                <div className="space-y-4 pt-2 border-t border-white/5">
                  <Field
                    label={
                      f.access_type === "telegram" ? "Telegram invite link"
                      : f.access_type === "whatsapp" ? "WhatsApp group or chat link"
                      : f.access_type === "drive" ? "Google Drive folder link"
                      : "Access link"
                    }
                    hint="Only students who paid ever see this."
                  >
                    <input className="field" value={f.access_url}
                      onChange={(e) => set("access_url", e.target.value)}
                      placeholder={
                        f.access_type === "telegram" ? "https://t.me/+xxxxxxxx"
                        : f.access_type === "whatsapp" ? "https://chat.whatsapp.com/xxxx or https://wa.me/234..."
                        : f.access_type === "drive" ? "https://drive.google.com/drive/folders/..."
                        : "https://"
                      } />
                  </Field>

                  <Field label="Instruction shown above the button"
                    hint="Tell them what to do next. Shows on the course page after payment.">
                    <textarea className="field" rows={3} value={f.access_note}
                      onChange={(e) => set("access_note", e.target.value)}
                      placeholder={"Join the group and introduce yourself.\nLive class every Saturday, 7pm Nigerian time."} />
                  </Field>

                  <Field label="Button text" hint="Leave blank to use the default.">
                    <input className="field" value={f.access_button_label}
                      onChange={(e) => set("access_button_label", e.target.value)}
                      placeholder="Join the group" />
                  </Field>
                </div>
              )}

              {needsLessons && !isNew && (
                <div className="bg-white/[0.03] rounded-xl p-4 text-sm text-muted">
                  Add the actual lessons on the Lessons tab above.
                </div>
              )}
              {needsLessons && isNew && (
                <div className="bg-white/[0.03] rounded-xl p-4 text-sm text-muted">
                  Save the course first, then a Lessons tab appears where you add them.
                </div>
              )}
            </div>

            <div className="panel p-6 space-y-4">
              <h3 className="font-bold text-white">Course outcomes</h3>
              <Field label="What students will learn" hint="One point per line.">
                <textarea className="field" rows={6} value={f.what_you_learn}
                  onChange={(e) => set("what_you_learn", e.target.value)}
                  placeholder={"Pick a niche that actually sells\nSet up to get paid in Nigeria\nWrite messages that sell without sounding salesy"} />
              </Field>
              <Field label="Requirements" hint="One per line.">
                <textarea className="field" rows={3} value={f.requirements}
                  onChange={(e) => set("requirements", e.target.value)}
                  placeholder={"A smartphone\nData and a little daily time"} />
              </Field>
            </div>
          </div>

          <div className="space-y-5">
            <div className="panel p-6 space-y-4">
              <h3 className="font-bold text-white">Course cover</h3>
              <CoverUpload
                value={f.thumbnail_url}
                title={f.title}
                onChange={(url) => set("thumbnail_url", url)}
              />
            </div>

            <div className="panel p-6 space-y-4">
              <h3 className="font-bold text-white">Pricing</h3>
              <Field label="Price in Naira">
                <input className="field" type="number" value={f.price_ngn}
                  onChange={(e) => set("price_ngn", e.target.value)} />
              </Field>
              <Field label="Compare at price" hint="Shows crossed out. Set 0 to hide.">
                <input className="field" type="number" value={f.compare_price}
                  onChange={(e) => set("compare_price", e.target.value)} />
              </Field>
              <Check label="This course is free" checked={f.is_free}
                onChange={(v) => set("is_free", v)} />
            </div>

            <div className="panel p-6 space-y-4">
              <h3 className="font-bold text-white">Display</h3>
              <Field label="Category">
                <select className="field" value={f.category_id}
                  onChange={(e) => set("category_id", e.target.value)}>
                  <option value="">No category</option>
                  {cats.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
                </select>
              </Field>
              <Field label="Level">
                <select className="field" value={f.level} onChange={(e) => set("level", e.target.value)}>
                  <option>Beginner</option>
                  <option>Intermediate</option>
                  <option>Advanced</option>
                </select>
              </Field>
              <Field label="Emoji icon">
                <input className="field text-2xl" value={f.emoji}
                  onChange={(e) => set("emoji", e.target.value)} maxLength={4} />
              </Field>
              <Field label="Duration text" hint="e.g. 15 modules, about 2 hours">
                <input className="field" value={f.duration_text}
                  onChange={(e) => set("duration_text", e.target.value)} />
              </Field>
              <Field label="Sort order" hint="Lower numbers show first.">
                <input className="field" type="number" value={f.sort_order}
                  onChange={(e) => set("sort_order", e.target.value)} />
              </Field>
            </div>

            <div className="panel p-6 space-y-3">
              <h3 className="font-bold text-white">Visibility</h3>
              <Check label="Published and visible to students" checked={f.is_published}
                onChange={(v) => set("is_published", v)} />
              <Check label="Show as featured on homepage" checked={f.is_featured}
                onChange={(v) => set("is_featured", v)} />
            </div>
          </div>
        </div>
      )}

      {tab === "lessons" && !isNew && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm text-muted">
              Lessons only show to students who paid. Mark one as a free preview to let visitors sample it.
            </p>
            <button onClick={addLesson} className="btn-gold text-sm shrink-0">Add lesson</button>
          </div>

          {lessons.length === 0 ? (
            <div className="panel p-12 text-center text-muted">
              No lessons yet. Add your first one above.
            </div>
          ) : (
            lessons.map((l, i) => (
              <div key={l.id} className="panel p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-gold/15 text-gold grid place-items-center text-xs font-bold shrink-0">
                    {i + 1}
                  </span>
                  <input className="field flex-1" value={l.title}
                    onChange={(e) => updLesson(l.id, { title: e.target.value })} />
                  <button onClick={() => delLesson(l.id)}
                    className="text-sm text-red-400 hover:underline shrink-0">Delete</button>
                </div>

                <div className="grid sm:grid-cols-3 gap-3">
                  <select className="field" value={l.content_type}
                    onChange={(e) => updLesson(l.id, { content_type: e.target.value })}>
                    <option value="text">Text lesson</option>
                    <option value="video">Embedded video</option>
                    <option value="drive">Google Drive link</option>
                    <option value="pdf">PDF download</option>
                    <option value="telegram">Telegram link</option>
                    <option value="whatsapp">WhatsApp link</option>
                    <option value="external">Other link</option>
                  </select>
                  <input className="field sm:col-span-2" placeholder="Link or file URL (leave blank for text only)"
                    value={l.content_url || ""}
                    onChange={(e) => updLesson(l.id, { content_url: e.target.value })} />
                </div>

                <textarea className="field font-mono text-xs" rows={6}
                  placeholder="Lesson content. Plain text or simple HTML."
                  value={l.content || ""}
                  onChange={(e) => updLesson(l.id, { content: e.target.value })} />

                <label className="flex items-center gap-2 text-sm text-muted cursor-pointer">
                  <input type="checkbox" checked={l.is_preview || false}
                    onChange={(e) => updLesson(l.id, { is_preview: e.target.checked })}
                    className="w-4 h-4 accent-gold" />
                  Free preview, visible before payment
                </label>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="text-xs text-white/30 mt-1.5">{hint}</p>}
    </div>
  );
}

function Check({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2.5 text-sm text-muted cursor-pointer">
      <input type="checkbox" checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 accent-gold" />
      {label}
    </label>
  );
}

function CoverUpload({ value, title, onChange }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErr("");

    if (!file.type.startsWith("image/")) {
      setErr("Please choose an image file (JPG, PNG or WEBP).");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setErr("That image is over 3MB. Please use a smaller one.");
      return;
    }

    setBusy(true);
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = Date.now() + "-" + (slugify(title) || "course") + "." + ext;

    const { error } = await supabase.storage
      .from("course-covers")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (error) {
      setBusy(false);
      setErr("Upload failed: " + error.message);
      return;
    }

    const { data } = supabase.storage.from("course-covers").getPublicUrl(path);
    onChange(data.publicUrl);
    setBusy(false);
  }

  return (
    <div className="space-y-3">
      <div className="aspect-video rounded-xl overflow-hidden bg-white/[0.03] border border-dashed border-white/15 grid place-items-center">
        {value ? (
          <img src={value} alt="Course cover" className="w-full h-full object-cover" />
        ) : (
          <span className="text-xs text-muted px-4 text-center">No cover yet</span>
        )}
      </div>

      <label className={"btn-gold text-sm w-full block text-center cursor-pointer " + (busy ? "opacity-60 pointer-events-none" : "")}>
        {busy ? "Uploading..." : value ? "Change cover" : "Upload cover"}
        <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </label>

      {value && (
        <button type="button" onClick={() => onChange("")}
          className="text-xs text-red-400 hover:underline w-full text-center">
          Remove cover
        </button>
      )}

      {err && <p className="text-xs text-red-400">{err}</p>}

      <p className="text-xs text-white/30 leading-relaxed">
        Best size 1280 by 720 pixels (landscape). JPG or PNG, under 3MB.
        Click Save course after uploading.
      </p>
    </div>
  );
}
