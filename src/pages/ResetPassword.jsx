import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function ResetPassword() {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [checked, setChecked] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => { if (data?.session) setReady(true); });
    const t = setTimeout(() => setChecked(true), 3000);
    return () => { sub?.subscription?.unsubscribe(); clearTimeout(t); };
  }, []);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    if (pw.length < 6) return setErr("Password must be at least 6 characters.");
    if (pw !== pw2) return setErr("The two passwords do not match.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setErr(error.message);
    nav("/dashboard");
  }

  if (!ready) {
    return (
      <div className="max-w-md mx-auto px-5 py-24 text-center">
        {checked ? (
          <>
            <h1 className="text-2xl font-black text-white mb-3">This link has expired</h1>
            <p className="text-muted mb-6">Reset links only work once and for a short time. Request a new one.</p>
            <Link to="/forgot-password" className="btn-gold inline-block">Send a new link</Link>
          </>
        ) : (
          <p className="text-muted">Checking your reset link...</p>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-5 py-20">
      <div className="panel p-8">
        <h1 className="text-2xl font-black text-white mb-1">Set a new password</h1>
        <p className="text-sm text-muted mb-7">Choose something you will remember.</p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">New password</label>
            <input className="field" type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
          </div>
          <div>
            <label className="label">Type it again</label>
            <input className="field" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
          </div>
          {err && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-300">{err}</div>
          )}
          <button className="btn-gold w-full" disabled={busy}>{busy ? "Saving..." : "Save new password"}</button>
        </form>
      </div>
    </div>
  );
}
