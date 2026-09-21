import { Link, useSearchParams } from "react-router-dom";

export default function PaymentSuccess() {
  const [p] = useSearchParams();
  const slug = p.get("course");
  const ref = p.get("ref");

  return (
    <div className="max-w-xl mx-auto px-5 py-24 text-center">
      <div className="w-20 h-20 rounded-full bg-mint/15 border-2 border-mint/40 grid place-items-center mx-auto mb-6">
        <span className="text-4xl text-mint font-black">+</span>
      </div>
      <h1 className="text-3xl font-black text-white mb-3">Payment successful</h1>
      <p className="text-muted mb-2">
        Your course has been added to your account. You can start learning right away.
      </p>
      {ref && <p className="text-xs text-white/25 mb-8">Reference: {ref}</p>}
      <div className="flex gap-3 justify-center flex-wrap">
        {slug && <Link to={"/learn/" + slug} className="btn-gold">Start learning</Link>}
        <Link to="/dashboard" className="btn-ghost">Go to my courses</Link>
      </div>
    </div>
  );
}
