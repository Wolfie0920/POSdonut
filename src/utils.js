export const peso = (n) => "₱" + Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const isToday = (r) => {
  const d = r.createdAt?.toDate?.() ?? new Date();
  return d.toDateString() === new Date().toDateString();
};
export const num = (n) => Number(Number(n || 0).toFixed(2)).toLocaleString("en-PH");
// "out" at 0; "low" when an ingredient is down to its last unit, or a product has 5 or fewer left.
export const stockStatus = (i) => {
  if (i.stock <= 0) return "out";
  const limit = i.type === "ingredient" ? 1 : 5;
  return i.stock <= limit ? "low" : "ok";
};
export const pesoShort = (n) => "₱" + new Intl.NumberFormat("en-PH", { notation: "compact", maximumFractionDigits: 1 }).format(n || 0);
export const PERIODS = [["today", "Today", 1], ["week", "7 days", 7], ["month", "30 days", 30], ["all", "All time", null]];
export const inRange = (r, days) => days === null || (days === 1 ? isToday(r) : Date.now() - (r.createdAt?.toDate?.() ?? new Date()) <= days * 864e5);
