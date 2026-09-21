import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e) {
    e.preventDefault();
    setErr(""); setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin + "/reset-password",
    });
    setBusy(false);
    if (error) return setErr(error.message);
    setSent(true);
  }

  return (
    <div className="max-w-md mx-auto px-5 py-20">
      <div className="panel p-8">
        {sent ? (
          <>
            <h1 className="text-2xl font-black text-white mb-3">Check your email</h1>
            <p className="text-muted mb-6">
              If there is an account for <span className="text-white">{email}</span>, we have sent a link to reset your password.
              It can take a few minutes. Check your spam folder too.
            </p>
            <Link to="/login" className="btn-ghost inline-block">Back to sign in</Link>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-black text-white mb-1">Forgot your password?</h1>
            <p className="text-sm text-muted mb-7">Enter the email you signed up with and we will send you a reset link.</p>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="label">Email</label>
                <input className="field" type="email" required value={email}
                  onChange={(e) => setEmail(e.target.value)} />
              </div>
              {err && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-300">{err}</div>
              )}
              <button className="btn-gold w-full" disabled={busy}>{busy ? "Sending..." : "Send reset link"}</button>
            </form>
            <p className="text-sm text-muted text-center mt-6">
              Remembered it? <Link to="/login" className="text-gold hover:underline">Sign in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
