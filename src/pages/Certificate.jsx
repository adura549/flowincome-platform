import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

function longDate(d) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export default function Certificate() {
  const { code } = useParams();
  const [c, setC] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("verify_certificate", { p_code: code });
      setC(data?.[0] || null);
      setLoading(false);
    })();
  }, [code]);

  if (loading) {
    return <div className="max-w-5xl mx-auto px-5 py-24 text-center text-muted">Checking certificate...</div>;
  }

  if (!c) {
    return (
      <div className="max-w-md mx-auto px-5 py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 grid place-items-center mx-auto mb-5 text-2xl text-red-300 font-black">!</div>
        <h1 className="text-2xl font-black text-white mb-3">No certificate found</h1>
        <p className="text-muted">
          There is no Flow Income Academy certificate with the number <span className="font-mono text-white">{code}</span>.
          Check the number and try again.
        </p>
      </div>
    );
  }

  const completed = c.basis === "completed";
  const verifyUrl = window.location.origin + "/verify/" + c.code;
  const qr = "https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=0&data=" + encodeURIComponent(verifyUrl);
  const issued = new Date(c.issued_at);
  const skills = (c.skills || []).slice(0, 4);

  const linkedIn =
    "https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME" +
    "&name=" + encodeURIComponent(c.course_title) +
    "&organizationName=" + encodeURIComponent("Flow Income Academy") +
    "&issueYear=" + issued.getFullYear() +
    "&issueMonth=" + (issued.getMonth() + 1) +
    "&certUrl=" + encodeURIComponent(verifyUrl) +
    "&certId=" + encodeURIComponent(c.code);

  function copyLink() {
    navigator.clipboard.writeText(verifyUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 0; }
          html, body { background: #fff !important; }
          header, footer, .no-print { display: none !important; }
          main { padding: 0 !important; }
          .cert-wrap { padding: 0 !important; margin: 0 !important; max-width: none !important; }
          #cert {
            width: 297mm !important; height: 210mm !important;
            border-radius: 0 !important; box-shadow: none !important;
            -webkit-print-color-adjust: exact; print-color-adjust: exact;
          }
        }
      `}</style>

      {/* Verification banner */}
      <div className="no-print panel p-5 mb-6 border-mint/30 flex items-start gap-4 flex-wrap">
        <div className="w-11 h-11 rounded-full bg-mint/15 border border-mint/40 grid place-items-center text-mint text-xl font-black shrink-0">
          {"\u2713"}
        </div>
        <div className="flex-1 min-w-[240px]">
          <div className="font-bold text-white">Verified certificate</div>
          <div className="text-sm text-muted mt-0.5">
            Issued by Flow Income Academy to <span className="text-white">{c.student_name}</span> on {longDate(c.issued_at)}.
          </div>
          <div className="text-sm text-muted mt-1">
            {completed
              ? "Earned by completing all " + c.lesson_count + " lessons of this course on the platform."
              : "Issued on enrolment in a community based course. Lesson completion is not tracked on the platform."}
          </div>
        </div>
        <div className="text-xs font-mono text-muted self-center">{c.code}</div>
      </div>

      {/* Actions */}
      <div className="no-print flex gap-3 flex-wrap mb-6">
        {c.is_owner && (
          <>
            <button onClick={() => window.print()} className="btn-gold text-sm">Download as PDF</button>
            <a href={linkedIn} target="_blank" rel="noreferrer" className="btn-ghost text-sm">Add to LinkedIn</a>
          </>
        )}
        <button onClick={copyLink} className="btn-ghost text-sm">{copied ? "Link copied" : "Copy verification link"}</button>
        <Link to={"/course/" + c.course_slug} className="btn-ghost text-sm">View the course</Link>
      </div>

      {c.is_owner && (
        <p className="no-print text-xs text-white/30 mb-6">
          To save as PDF: click Download as PDF, then in the print window choose "Save as PDF" as the destination,
          set layout to Landscape, and turn on "Background graphics".
        </p>
      )}

      {/* The certificate */}
      <div className="cert-wrap overflow-x-auto">
        <div
          id="cert"
          className="relative mx-auto rounded-lg shadow-2xl"
          style={{
            width: "100%", minWidth: 760, aspectRatio: "1.414 / 1",
            background: "linear-gradient(135deg, #FFFDF6 0%, #FBF6E8 100%)",
            color: "#1B2437",
            fontFamily: "Georgia, 'Times New Roman', serif",
          }}
        >
          {/* borders */}
          <div style={{ position: "absolute", inset: "3%", border: "2px solid #C9A227" }} />
          <div style={{ position: "absolute", inset: "4.2%", border: "1px solid rgba(201,162,39,0.45)" }} />

          <div style={{ position: "absolute", inset: "7% 8%", display: "flex", flexDirection: "column" }}>
            {/* header row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontFamily: "Inter, Arial, sans-serif", fontWeight: 900, fontSize: 22, letterSpacing: "-0.02em" }}>
                  <span style={{ color: "#C9A227" }}>Flow</span> Income Academy
                </div>
                <div style={{ fontFamily: "Inter, Arial, sans-serif", fontSize: 10, letterSpacing: "0.2em", color: "#6B7280", marginTop: 2 }}>
                  PRACTICAL INCOME SKILLS
                </div>
              </div>
              <div style={{ textAlign: "right", fontFamily: "Inter, Arial, sans-serif", fontSize: 10, color: "#6B7280", lineHeight: 1.6 }}>
                <div style={{ letterSpacing: "0.15em" }}>CERTIFICATE NO.</div>
                <div style={{ fontFamily: "monospace", fontSize: 13, color: "#1B2437", fontWeight: 700 }}>{c.code}</div>
              </div>
            </div>

            {/* body */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
              <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: "0.01em", lineHeight: 1.1 }}>
                {completed ? "Certificate of Completion" : "Certificate of Participation"}
              </div>
              <div style={{ width: 90, height: 2, background: "#C9A227", margin: "14px auto 18px" }} />
              <div style={{ fontSize: 14, fontStyle: "italic", color: "#4B5563" }}>This is to certify that</div>
              <div style={{ fontSize: 42, fontWeight: 700, color: "#0F1B33", margin: "10px 0 8px", lineHeight: 1.15 }}>
                {c.student_name}
              </div>
              <div style={{ fontSize: 14, fontStyle: "italic", color: "#4B5563" }}>
                {completed ? "has successfully completed the course" : "took part in the course"}
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#0F1B33", marginTop: 10, maxWidth: "85%", lineHeight: 1.25 }}>
                {c.course_title}
              </div>

              {skills.length > 0 && (
                <div style={{ fontFamily: "Inter, Arial, sans-serif", fontSize: 11, color: "#4B5563", marginTop: 16, maxWidth: "80%", lineHeight: 1.6 }}>
                  <span style={{ fontWeight: 700, color: "#C9A227", letterSpacing: "0.12em" }}>SKILLS COVERED </span>
                  {skills.join("  \u00b7  ")}
                </div>
              )}
            </div>

            {/* footer row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div style={{ minWidth: 200 }}>
                <div style={{ fontSize: 24, fontStyle: "italic", color: "#0F1B33", marginBottom: 2 }}>{c.instructor_name}</div>
                <div style={{ borderTop: "1px solid #1B2437", paddingTop: 6, fontFamily: "Inter, Arial, sans-serif", fontSize: 11 }}>
                  <div style={{ fontWeight: 700 }}>{c.instructor_name}</div>
                  <div style={{ color: "#6B7280" }}>{c.instructor_title}</div>
                </div>
              </div>

              <div style={{
                width: 92, height: 92, borderRadius: "50%",
                border: "3px double #C9A227", display: "grid", placeItems: "center",
                fontFamily: "Inter, Arial, sans-serif", textAlign: "center", color: "#C9A227",
              }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 18, lineHeight: 1 }}>FIA</div>
                  <div style={{ fontSize: 8, letterSpacing: "0.15em", marginTop: 4, fontWeight: 700 }}>VERIFIED</div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
                <div style={{ textAlign: "right", fontFamily: "Inter, Arial, sans-serif", fontSize: 11 }}>
                  <div style={{ color: "#6B7280" }}>Date issued</div>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>{longDate(c.issued_at)}</div>
                  <div style={{ color: "#6B7280" }}>Verify at</div>
                  <div style={{ fontWeight: 600, fontSize: 10 }}>{verifyUrl.replace(/^https?:\/\//, "")}</div>
                </div>
                <img src={qr} alt="Scan to verify" width={78} height={78} style={{ display: "block" }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
