import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

import Home from "./pages/Home";
import Courses from "./pages/Courses";
import CourseDetail from "./pages/CourseDetail";
import Checkout from "./pages/Checkout";
import PaymentSuccess from "./pages/PaymentSuccess";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Learn from "./pages/Learn";

import AdminLayout from "./pages/admin/AdminLayout";
import AdminHome from "./pages/admin/AdminHome";
import AdminCourses from "./pages/admin/AdminCourses";
import CourseEditor from "./pages/admin/CourseEditor";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminStudents from "./pages/admin/AdminStudents";

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Splash />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AdminOnly({ children }) {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return <Splash />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}

function Splash() {
  return (
    <div className="min-h-screen grid place-items-center">
      <div className="text-center">
        <div className="text-3xl font-black text-gold mb-2">Flow</div>
        <div className="text-sm text-muted">Loading...</div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/course/:slug" element={<CourseDetail />} />
          <Route path="/checkout/:slug" element={<Checkout />} />
          <Route path="/payment/success" element={<PaymentSuccess />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
          <Route path="/learn/:slug" element={<Protected><Learn /></Protected>} />

          <Route path="/admin" element={<AdminOnly><AdminLayout /></AdminOnly>}>
            <Route index element={<AdminHome />} />
            <Route path="courses" element={<AdminCourses />} />
            <Route path="courses/new" element={<CourseEditor />} />
            <Route path="courses/:id" element={<CourseEditor />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="students" element={<AdminStudents />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

function NotFound() {
  return (
    <div className="max-w-3xl mx-auto px-5 py-28 text-center">
      <div className="text-6xl font-black text-gold mb-3">404</div>
      <p className="text-muted mb-6">That page does not exist.</p>
      <a href="/" className="btn-gold inline-block">Back to home</a>
    </div>
  );
}
