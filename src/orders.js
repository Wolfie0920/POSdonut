import { collection, doc, increment, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

const orderNumber = () => {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `ORD-${ymd}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
};

// Places an order in ONE atomic transaction: checks live stock, deducts product stock,
// records one sale per item (so Sales, Dashboard and revenue update by themselves) and saves the order.
export async function placeOrder({ cart, customer, method, reference = "", cash, takenBy }) {
  const orderRef = doc(collection(db, "orders"));
  const orderNo = orderNumber();
  return runTransaction(db, async (tx) => {
    const refs = cart.map((l) => doc(db, "inventory", l.id));
    const snaps = await Promise.all(refs.map((r) => tx.get(r)));
    const items = snaps.map((s, i) => {
      if (!s.exists()) throw new Error(`${cart[i].name} is no longer in Inventory.`);
      const p = s.data();
      if (p.stock < cart[i].qty) throw new Error(`Only ${p.stock} ${p.name} left. Lower the quantity and try again.`);
      return { itemId: s.id, itemName: p.name, qty: cart[i].qty, unitPrice: p.price, total: p.price * cart[i].qty };
    });
    const total = items.reduce((s, l) => s + l.total, 0);
    if (method !== "Cash" && !reference) throw new Error("Enter the payment reference number.");
    if (method === "Cash" && cash < total) throw new Error("Cash received is less than the total.");
    const saleIds = [];
    items.forEach((l, i) => {
      const saleRef = doc(collection(db, "sales"));
      saleIds.push(saleRef.id);
      tx.set(saleRef, { ...l, orderId: orderRef.id, orderNo, createdAt: serverTimestamp() });
      tx.update(refs[i], { stock: increment(-l.qty) });
    });
    const paid = method === "Cash" ? cash : total;
    const change = paid - total;
    tx.set(orderRef, { orderNo, customer, method, reference, total, paid, change, items, saleIds, takenBy, createdAt: serverTimestamp() });
    return { orderNo, customer, method, reference, total, paid, change, items, takenBy, date: new Date() };
  });
}

// Owner only: removes the order and its sales, and puts the stock back.
export async function voidOrder(order) {
  await runTransaction(db, async (tx) => {
    const snaps = await Promise.all(order.items.map((l) => tx.get(doc(db, "inventory", l.itemId))));
    snaps.forEach((s, i) => { if (s.exists()) tx.update(s.ref, { stock: increment(order.items[i].qty) }); });
    (order.saleIds || []).forEach((id) => tx.delete(doc(db, "sales", id)));
    tx.delete(doc(db, "orders", order.id));
  });
}
