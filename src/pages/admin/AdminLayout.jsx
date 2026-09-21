import { NavLink, Outlet } from "react-router-dom";

export default function AdminLayout() {
  const link = ({ isActive }) =>
    "block px-4 py-2.5 rounded-lg text-sm transition " +
    (isActive ? "bg-gold text-black font-bold" : "text-muted hover:bg-white/5 hover:text-white");

  return (
    <div className="max-w-6xl mx-auto px-5 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-black text-white">Admin</h1>
        <span className="chip bg-gold/15 text-gold">Owner access</span>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <aside className="lg:col-span-1">
          <nav className="panel p-3 space-y-1 lg:sticky lg:top-24">
            <NavLink to="/admin" end className={link}>Overview</NavLink>
            <NavLink to="/admin/courses" className={link}>Courses</NavLink>
            <NavLink to="/admin/orders" className={link}>Orders</NavLink>
            <NavLink to="/admin/students" className={link}>Students</NavLink>
          </nav>
        </aside>
        <div className="lg:col-span-4">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
