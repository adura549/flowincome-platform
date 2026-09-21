import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-[#080B0E] border-t border-white/5 mt-20">
      <div className="max-w-6xl mx-auto px-5 py-12">
        <div className="grid md:grid-cols-3 gap-10">
          <div>
            <div className="text-xl font-black text-gold mb-2">Flow Income Academy</div>
            <p className="text-sm text-muted leading-relaxed">
              Practical income skills for Nigerians. Learn at your own pace and
              start earning with what you learn.
            </p>
          </div>
          <div>
            <div className="text-sm font-semibold text-white mb-3">Explore</div>
            <div className="space-y-2 text-sm">
              <Link to="/courses" className="block text-muted hover:text-white">All Courses</Link>
              <Link to="/dashboard" className="block text-muted hover:text-white">My Courses</Link>
              <Link to="/register" className="block text-muted hover:text-white">Create Account</Link>
            </div>
          </div>
          <div>
            <div className="text-sm font-semibold text-white mb-3">Support</div>
            <div className="space-y-2 text-sm text-muted">
              <div>Payment via Flutterwave</div>
              <div>Instant access after payment</div>
              <div>flowincome.site</div>
            </div>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-white/5 text-xs text-white/25">
          Copyright {new Date().getFullYear()} Flow Income Academy. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
