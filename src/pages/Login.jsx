import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { signIn } = useAuth();
  const nav = useNavigate();
  const [p] = useSearchParams();
  const next = p.get("next") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr(""); setBusy(true);
    const { error } = await signIn(email, password);
    setBusy(false);
    if (error) return setErr(error.message);
    nav(next);
  }

  return (
    <div className="max-w-md mx-auto px-5 py-20">
      <div className="panel p-8">
        <h1 className="text-2xl font-black text-white mb-1">Welcome back</h1>
        <p className="text-sm text-muted mb-7">Sign in to reach your courses.</p>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input className="field" type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <div className="flex justify-between items-baseline">
              <label className="label">Password</label>
              <Link to="/forgot-password" className="text-xs text-gold hover:underline">Forgot password?</Link>
            </div>
            <input className="field" type="password" required value={password}
              onChange={(e) => setPassword(e.target.value)} />
          </div>

          {err && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-300">
              {err}
            </div>
          )}

          <button className="btn-gold w-full" disabled={busy}>
            {busy ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="text-sm text-muted text-center mt-6">
          New here? <Link to="/register" className="text-gold hover:underline">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
