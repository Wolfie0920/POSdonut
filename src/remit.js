import { collection, deleteField, doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { round2 } from "./payroll";

// A cashier hands over the day's sales: the system works out the cash that SHOULD be on hand (cash sales),
// compares it with the cash actually counted, and records over/short. The orders are marked as remitted.
export async function createRemittance({ orders, actualCash, note, user }) {
  if (orders.length === 0) throw new Error("There are no orders to remit.");
  if (orders.length > 400) throw new Error("Too many orders to remit at once. Ask the owner for help.");
  const ref = doc(collection(db, "remittances"));
  return runTransaction(db, async (tx) => {
    const snaps = await Promise.all(orders.map((o) => tx.get(doc(db, "orders", o.id))));
    if (snaps.some((s) => !s.exists() || s.data().remittanceId)) throw new Error("Some orders were already remitted or removed. Refresh the page and try again.");
    const byMethod = {}; let total = 0; let expected = 0;
    snaps.forEach((s) => { const o = s.data(); total += o.total; byMethod[o.method] = round2((byMethod[o.method] || 0) + o.total); if (o.method === "Cash") expected += o.total; });
    snaps.forEach((s) => tx.update(s.ref, { remittanceId: ref.id }));
    const data = {
      cashier: (user.email || "").split("@")[0], cashierUid: user.uid, orderIds: orders.map((o) => o.id), orderCount: orders.length,
      totalSales: round2(total), byMethod, expectedCash: round2(expected), actualCash: round2(actualCash),
      variance: round2(actualCash - expected), note, createdAt: serverTimestamp(),
    };
    tx.set(ref, data);
    return data;
  });
}

// Owner only: undo a remittance so its orders can be remitted again.
export async function voidRemittance(r) {
  await runTransaction(db, async (tx) => {
    const snaps = await Promise.all((r.orderIds || []).map((id) => tx.get(doc(db, "orders", id))));
    snaps.forEach((s) => { if (s.exists()) tx.update(s.ref, { remittanceId: deleteField() }); });
    tx.delete(doc(db, "remittances", r.id));
  });
}
