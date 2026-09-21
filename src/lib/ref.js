import { supabase } from "./supabase";

const KEY = "fia_ref";
const DAYS = 30;

// Call on every page load. Saves ?ref=CODE for 30 days and counts one click.
export function captureRef() {
  try {
    const code = new URLSearchParams(window.location.search).get("ref");
    if (!code) return;
    const clean = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!clean) return;

    const prev = JSON.parse(localStorage.getItem(KEY) || "null");
    localStorage.setItem(KEY, JSON.stringify({ code: clean, at: Date.now() }));

    // count the click once per code per browser
    if (!prev || prev.code !== clean) {
      supabase.rpc("track_ref_click", { p_code: clean }).then(() => {}, () => {});
    }
  } catch {
    /* storage blocked, ignore */
  }
}

// Returns the saved referral code if it is less than 30 days old
export function getRef() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!saved?.code) return null;
    if (Date.now() - saved.at > DAYS * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(KEY);
      return null;
    }
    return saved.code;
  } catch {
    return null;
  }
}
