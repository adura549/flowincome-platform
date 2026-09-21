import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { signUp } = useAuth();
  const nav = useNavigate();

  const [f, setF] = useState({ name: "", email: "", phone: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    if (f.password.length < 6) return setErr("Password must be at least 6 characters.");
    setBusy(true);
    const { data, error } = await signUp(f.email, f.password, f.name, f.phone);
    setBusy(false);
    if (error) return setErr(error.message);
    if (data?.session) nav("/dashboard");
    else setDone(true);
  }

  if (done) {
    return (
      <div className="max-w-md mx-auto px-5 py-24 text-center">
        <h1 className="text-2xl font-black text-white mb-3">Check your email</h1>
        <p className="text-muted mb-6">
          We sent a confirmation link to {f.email}. Click it to activate your account.
        </p>
        <Link to="/login" className="btn-ghost inline-block">Back to sign in</Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-5 py-20">
      <div className="panel p-8">
        <h1 className="text-2xl font-black text-white mb-1">Create your account</h1>
        <p className="text-sm text-muted mb-7">It takes less than a minute.</p>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Full name</label>
            <input className="field" required value={f.name}
              onChange={(e) => setF({ ...f, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="field" type="email" required value={f.email}
              onChange={(e) => setF({ ...f, email: e.target.value })} />
          </div>
          <div>
            <label className="label">Phone number</label>
            <input className="field" value={f.phone} placeholder="08012345678"
              onChange={(e) => setF({ ...f, phone: e.target.value })} />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="field" type="password" required value={f.password}
              onChange={(e) => setF({ ...f, password: e.target.value })} />
          </div>

          {err && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-300">
              {err}
            </div>
          )}

          <button className="btn-gold w-full" disabled={busy}>
            {busy ? "Creating account..." : "Create account"}
          </button>
          <p className="text-xs text-muted text-center leading-relaxed">
            By creating an account you agree to our <Link to="/terms" className="text-gold hover:underline">Terms</Link> and <Link to="/privacy" className="text-gold hover:underline">Privacy Policy</Link>.
          </p>
        </form>

        <p className="text-sm text-muted text-center mt-6">
          Already have an account? <Link to="/login" className="text-gold hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
