// Edit these to match your business. They appear at the top and bottom of every receipt.
export const BUSINESS = {
  name: "MACHO DONUT",
  address: "MAGALLANES, SORSOGON CITY",
  phone: "Tel: 09XX XXX XXXX",
  footer: "Thank you! Please come again.",
};

// Modes of payment. `ref` is the label of the reference number the cashier must enter (null = none needed).
export const PAYMENT_METHODS = [
  { name: "Cash", ref: null },
  { name: "GCash", ref: "GCash reference no." },
  { name: "Maya", ref: "Maya reference no." },
  { name: "Card", ref: "Card approval code" },
  { name: "Bank transfer", ref: "Bank reference no." },
];
