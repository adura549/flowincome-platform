import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

const UPDATED = "21 September 2026";

function useSettings() {
  const [s, setS] = useState(null);
  useEffect(() => {
    supabase.from("site_settings").select("*").eq("id", 1).maybeSingle().then(({ data }) => setS(data || {}));
  }, []);
  return s;
}

function Contact({ s }) {
  const wa = s?.support_whatsapp;
  return (
    <>
      {wa && (
        <>WhatsApp: <a href={"https://wa.me/" + wa} target="_blank" rel="noreferrer">+{wa}</a></>
      )}
      {wa && s?.support_email && <br />}
      {s?.support_email && (
        <>Email: <a href={"mailto:" + s.support_email}>{s.support_email}</a></>
      )}
    </>
  );
}

function Shell({ title, children }) {
  return (
    <div className="max-w-3xl mx-auto px-5 py-14">
      <div className="text-[11px] font-bold text-gold tracking-widest uppercase mb-2">Policies</div>
      <h1 className="text-3xl md:text-4xl font-black text-white mb-2">{title}</h1>
      <p className="text-sm text-muted mb-8">Last updated {UPDATED}</p>

      <div className="flex gap-2 flex-wrap mb-10">
        <Link to="/terms" className="chip bg-white/5 text-muted hover:text-white">Terms</Link>
        <Link to="/privacy" className="chip bg-white/5 text-muted hover:text-white">Privacy</Link>
        <Link to="/refunds" className="chip bg-white/5 text-muted hover:text-white">Refunds</Link>
      </div>

      <div className="lesson-body text-muted">{children}</div>
    </div>
  );
}

export function Terms() {
  const s = useSettings();
  const who = s?.legal_entity || "Flow Income Academy";
  return (
    <Shell title="Terms of Use">
      <p>
        These terms explain how you can use Flow Income Academy. The site is run by <strong>{who}</strong>.
        By creating an account or buying a course, you agree to them. They are written plainly on purpose.
        If anything is unclear, message us before you pay.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>Give your real name and a working email. Your name is what appears on your certificates.</li>
        <li>Keep your password to yourself. You are responsible for what happens on your account.</li>
        <li>One account is for one person. Sharing a login with others is not allowed.</li>
      </ul>

      <h2>Buying a course</h2>
      <ul>
        <li>Prices are shown in Naira and are paid once. There is no subscription unless a course clearly says so.</li>
        <li>Payments are processed by Flutterwave. We never see or store your card details.</li>
        <li>Once your payment is confirmed, the course appears in My Courses. Most payments confirm within seconds. Some bank transfers take a few minutes.</li>
        <li>Some courses are delivered through a private Telegram group, WhatsApp group or Google Drive folder. Access to these is through the link shown to you after payment.</li>
      </ul>

      <h2>What you are allowed to do with the content</h2>
      <p>
        When you buy a course you get a personal licence to use it for your own learning, for as long as the site runs.
        You do not own the content, and you may not:
      </p>
      <ul>
        <li>Share, resell, upload or post the lessons, files or group links anywhere</li>
        <li>Record, screenshot or copy the course to pass it on to others</li>
        <li>Add people who have not paid to a course group</li>
      </ul>
      <p>If we find a course being shared, we can remove access from the account involved without a refund.</p>

      <h2>Results are not guaranteed</h2>
      <p>
        Our courses teach skills that people use to earn money. How much you earn, if anything, depends on your own effort,
        your market, your time and many things outside our control. Any income figures in our courses or adverts are
        examples, not promises. Nobody can honestly guarantee you an income, and we do not.
      </p>

      <h2>Certificates</h2>
      <p>
        Certificates show that you completed or took part in a course on this platform. Each one has a number and QR code
        that anyone can check. They are private academy certificates, not government or university qualifications.
      </p>

      <h2>Affiliate programme</h2>
      <ul>
        <li>Affiliates earn the commission shown on their dashboard on sales confirmed by our payment system.</li>
        <li>Purchases you make yourself do not earn commission.</li>
        <li>You must not spam, make false claims about results, pretend to be us, or run ads using our name in a misleading way.</li>
        <li>The sign up fee, where charged, is not refundable.</li>
        <li>We can pause an affiliate account that breaks these rules. Commission earned from fraud or refunded sales is not paid.</li>
        <li>Payouts are made to the bank account you provide. Please check your details carefully.</li>
      </ul>

      <h2>Changes and ending access</h2>
      <p>
        We may update courses to keep them current, change prices for new buyers, or update these terms.
        If we ever close a course, we will give reasonable notice where we can. We may close accounts that break these terms.
      </p>

      <h2>The law that applies</h2>
      <p>These terms are governed by the laws of the Federal Republic of Nigeria.</p>

      <h2>Contact</h2>
      <p><Contact s={s} /></p>
    </Shell>
  );
}

export function Privacy() {
  const s = useSettings();
  const who = s?.legal_entity || "Flow Income Academy";
  return (
    <Shell title="Privacy Policy">
      <p>
        This explains what personal information Flow Income Academy collects, why, and what you can ask us to do with it.
        The site is run by <strong>{who}</strong>. We follow the Nigeria Data Protection Act 2023.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account details:</strong> your name, email and phone number when you sign up.</li>
        <li><strong>Order details:</strong> what you bought, the amount, the date and the payment reference.</li>
        <li><strong>Learning progress:</strong> which lessons you have completed, so we can issue certificates.</li>
        <li><strong>Affiliate details:</strong> if you join the affiliate programme, your sales, and the bank details you give us for payouts.</li>
        <li><strong>Referral tracking:</strong> if you arrive through an affiliate link, your browser remembers that code for 30 days.</li>
      </ul>
      <p>We do not collect or store your card details. Card and bank payments are handled entirely by Flutterwave.</p>

      <h2>Why we use it</h2>
      <ul>
        <li>To give you access to what you bought and issue your certificates</li>
        <li>To confirm payments and pay affiliate commission</li>
        <li>To contact you about your account, your orders, or a problem</li>
        <li>To keep the site secure and stop course sharing and fraud</li>
      </ul>
      <p>We do not sell your personal information to anyone.</p>

      <h2>Who we share it with</h2>
      <p>Only the services we need to run the site:</p>
      <ul>
        <li><strong>Supabase</strong> stores the database and handles login</li>
        <li><strong>Flutterwave</strong> processes payments</li>
        <li><strong>Netlify</strong> hosts the website</li>
      </ul>
      <p>
        These providers may store data outside Nigeria. We may also share information if the law requires it.
        When you verify a certificate, the public page shows the name on the certificate, the course and the date, and nothing else.
      </p>

      <h2>How long we keep it</h2>
      <p>
        We keep your account for as long as it is active so you can keep accessing your courses. Order records are kept
        for accounting purposes. If you ask us to delete your account, we remove your personal details except where we
        must keep a record by law.
      </p>

      <h2>Your rights</h2>
      <p>You can ask us to:</p>
      <ul>
        <li>Tell you what information we hold about you</li>
        <li>Correct anything that is wrong, including the name on your certificates</li>
        <li>Delete your account and personal data</li>
        <li>Stop sending you marketing messages</li>
      </ul>
      <p>
        Message us using the contact below and we will respond within a reasonable time. If you are not satisfied,
        you can complain to the Nigeria Data Protection Commission.
      </p>

      <h2>Contact</h2>
      <p><Contact s={s} /></p>
    </Shell>
  );
}

export function Refunds() {
  const s = useSettings();
  return (
    <Shell title="Refund Policy">
      <p>
        Our courses are digital. Once you have access, the content cannot be returned the way a physical product can.
        So this policy is simple, and we would rather you ask questions before paying than be disappointed after.
      </p>

      <h2>You will always get a refund if</h2>
      <ul>
        <li>You were charged more than once for the same course</li>
        <li>You paid but did not get access, and we could not fix it within 3 days of you telling us</li>
        <li>The course was removed or is not what the sales page described in a material way</li>
      </ul>

      <h2>Other refund requests</h2>
      <p>
        If you are unhappy for another reason, message us within <strong>7 days</strong> of your purchase and tell us what went wrong.
        We review each request honestly. We are more likely to approve a refund if you have not gone far into the course
        and have not joined its private group.
      </p>

      <h2>No refunds for</h2>
      <ul>
        <li>Requests made more than 7 days after purchase</li>
        <li>Courses you have completed or received a certificate for</li>
        <li>Accounts removed for sharing course content</li>
        <li>The affiliate programme sign up fee</li>
        <li>Not making the income you hoped for. Results depend on your own work and are never guaranteed</li>
      </ul>

      <h2>How to ask</h2>
      <p>
        Send us your name, the email on your account, the course, and your payment reference. You can find the reference
        in your Flutterwave receipt or payment confirmation.
      </p>
      <p><Contact s={s} /></p>
      <p>
        Approved refunds go back through Flutterwave to your original payment method. Your bank may take a few working days
        to show it. When a refund is made, access to that course and any certificate for it is removed.
      </p>
    </Shell>
  );
}
