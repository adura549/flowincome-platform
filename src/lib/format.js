export const naira = (n) =>
  "NGN " + Number(n || 0).toLocaleString("en-NG", { maximumFractionDigits: 0 });

export const slugify = (s) =>
  (s || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

export const txRef = () =>
  "FIA-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8).toUpperCase();

export const dateShort = (d) =>
  d ? new Date(d).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : "";
