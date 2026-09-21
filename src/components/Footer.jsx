import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function Footer() {
  const [s, setS] = useState(null);
  useEffect(() => {
    supabase.from("site_settings").select("support_whatsapp, support_email, legal_entity")
      .eq("id", 1).maybeSingle().then(({ data }) => setS(data));
  }, []);

  return (
    <footer className="bg-[#080B0E] border-t border-white/5 mt-20">
      <div className="max-w-6xl mx-auto px-5 py-12">
        <div className="grid md:grid-cols-4 gap-10">
          <div className="md:col-span-2">
            <div className="text-xl font-black text-gold mb-2">Flow Income Academy</div>
            <p className="text-sm text-muted leading-relaxed max-w-sm">
              Practical income skills for Nigerians. Learn at your own pace and
              start earning with what you learn.
            </p>
          </div>
          <div>
            <div className="text-sm font-semibold text-white mb-3">Explore</div>
            <div className="space-y-2 text-sm">
              <Link to="/courses" className="block text-muted hover:text-white">All Courses</Link>
              <Link to="/dashboard" className="block text-muted hover:text-white">My Courses</Link>
              <Link to="/affiliate" className="block text-muted hover:text-white">Affiliate Programme</Link>
            </div>
          </div>
          <div>
            <div className="text-sm font-semibold text-white mb-3">Help</div>
            <div className="space-y-2 text-sm">
              {s?.support_whatsapp && (
                <a href={"https://wa.me/" + s.support_whatsapp} target="_blank" rel="noreferrer"
                   className="block text-muted hover:text-white">Chat on WhatsApp</a>
              )}
              {s?.support_email && (
                <a href={"mailto:" + s.support_email} className="block text-muted hover:text-white">{s.support_email}</a>
              )}
              <Link to="/terms" className="block text-muted hover:text-white">Terms of Use</Link>
              <Link to="/privacy" className="block text-muted hover:text-white">Privacy Policy</Link>
              <Link to="/refunds" className="block text-muted hover:text-white">Refund Policy</Link>
            </div>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-white/5 text-xs text-white/25">
          Copyright {new Date().getFullYear()} {s?.legal_entity || "Flow Income Academy"}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
