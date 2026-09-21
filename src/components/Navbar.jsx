import { Link, NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, profile, isAdmin, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const nav = useNavigate();

  async function handleOut() {
    await signOut();
    nav("/");
  }

  const link = ({ isActive }) =>
    "px-3 py-2 rounded-lg text-sm transition " +
    (isActive ? "text-gold font-semibold" : "text-muted hover:text-white hover:bg-white/5");

  return (
    <header className="sticky top-0 z-50 bg-ink/95 backdrop-blur border-b border-gold/15">
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="text-xl font-black text-gold shrink-0">
          Flow <span className="text-white font-bold">Income Academy</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          <NavLink to="/" end className={link}>Home</NavLink>
          <NavLink to="/courses" className={link}>All Courses</NavLink>
          {user && <NavLink to="/dashboard" className={link}>My Courses</NavLink>}
          <NavLink to="/affiliate" className={link}>Earn 30%</NavLink>
          {isAdmin && <NavLink to="/admin" className={link}>Admin</NavLink>}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <>
              <span className="text-sm text-muted max-w-[160px] truncate">
                {profile?.full_name || user.email}
              </span>
              <button onClick={handleOut} className="text-sm text-muted hover:text-white px-3 py-2">
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm text-muted hover:text-white px-3 py-2">Sign in</Link>
              <Link to="/register" className="btn-gold text-sm py-2 px-4">Create account</Link>
            </>
          )}
        </div>

        <button
          className="md:hidden text-white text-2xl leading-none px-2"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          {open ? "\u00d7" : "\u2261"}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-white/10 px-5 py-3 space-y-1">
          <Link to="/" onClick={() => setOpen(false)} className="block py-2 text-muted">Home</Link>
          <Link to="/courses" onClick={() => setOpen(false)} className="block py-2 text-muted">All Courses</Link>
          {user && <Link to="/dashboard" onClick={() => setOpen(false)} className="block py-2 text-muted">My Courses</Link>}
          <Link to="/affiliate" onClick={() => setOpen(false)} className="block py-2 text-muted">Earn 30%</Link>
          {isAdmin && <Link to="/admin" onClick={() => setOpen(false)} className="block py-2 text-gold">Admin</Link>}
          <div className="pt-2 border-t border-white/10">
            {user ? (
              <button onClick={handleOut} className="block py-2 text-muted w-full text-left">Sign out</button>
            ) : (
              <>
                <Link to="/login" onClick={() => setOpen(false)} className="block py-2 text-muted">Sign in</Link>
                <Link to="/register" onClick={() => setOpen(false)} className="block py-2 text-gold font-semibold">Create account</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
