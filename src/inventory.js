import { addDoc, collection, doc, increment, runTransaction, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

export const isProduct = (i) => (i.type || "product") === "product";
export const isIngredient = (i) => i.type === "ingredient";
// Stock is counted in units ("qty"), e.g. 5 qty of a 1 kg flour pack.
// Add/remove stock. If the item was deleted from Inventory meanwhile, there is nothing to adjust, so it is skipped.
export const adjustStock = async (id, qty) => {
  try { await updateDoc(doc(db, "inventory", id), { stock: increment(qty) }); }
  catch (e) { if (e.code !== "not-found") throw e; }
};
// Several stock changes at once: [[itemId, +/-qty], ...]. Items that no longer exist are skipped.
export async function adjustMany(changes) {
  await runTransaction(db, async (tx) => {
    const snaps = await Promise.all(changes.map(([id]) => tx.get(doc(db, "inventory", id))));
    snaps.forEach((s, i) => { if (s.exists()) tx.update(s.ref, { stock: increment(changes[i][1]) }); });
  });
}
export const MEASURES = ["kg", "g", "L", "mL", "pcs"].map((m) => ({ value: m, label: m }));

// An ingredient is identified by name + size + measure (Flour 1 kg and Flour 5 kg are separate rows).
// Returns its inventory id, creating it with 0 stock if new, and refreshing its latest price if it exists.
export async function findOrCreateIngredient(items, { name, unit, packSize, price }) {
  const found = items.find((i) => isIngredient(i) && i.name.trim().toLowerCase() === name.trim().toLowerCase()
    && i.unit === unit && Number(i.packSize) === Number(packSize));
  if (found) { await updateDoc(doc(db, "inventory", found.id), { price }); return found.id; }
  const ref = await addDoc(collection(db, "inventory"), {
    type: "ingredient", name: name.trim(), stock: 0, unit, packSize, price, createdAt: serverTimestamp(),
  });
  return ref.id;
}
