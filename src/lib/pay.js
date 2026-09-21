import { supabase } from "./supabase";

// Ask our server to confirm a payment with Flutterwave and grant access
export async function verifyOnServer(ref, transactionId) {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  try {
    const r = await fetch("/.netlify/functions/verify-payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + (token || ""),
      },
      body: JSON.stringify({ tx_ref: ref, transaction_id: transactionId || null }),
    });
    return await r.json();
  } catch {
    return { ok: false, error: "Could not reach the payment server. Please try again." };
  }
}

// Open the Flutterwave window. Resolves with transaction id, or null if not paid.
export function openFlutterwave({ ref, amount, customer, title, description }) {
  return new Promise((resolve) => {
    if (!window.FlutterwaveCheckout) {
      resolve({ error: "Payment window did not load. Refresh the page and try again." });
      return;
    }
    let settled = false;
    const modal = window.FlutterwaveCheckout({
      public_key: import.meta.env.VITE_FLW_PUBLIC_KEY,
      tx_ref: ref,
      amount,
      currency: "NGN",
      payment_options: "card,banktransfer,ussd,account",
      customer,
      customizations: { title, description },
      callback: (res) => {
        settled = true;
        try { modal?.close?.(); } catch { /* ignore */ }
        if (res?.status === "successful" || res?.status === "completed") {
          resolve({ transactionId: res.transaction_id });
        } else {
          resolve({ error: "Payment was not completed." });
        }
      },
      onclose: () => {
        if (!settled) resolve({ cancelled: true });
      },
    });
  });
}
