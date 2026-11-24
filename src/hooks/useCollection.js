import { useEffect, useState } from "react";
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { db } from "../firebase";

// Realtime READ + CREATE / UPDATE / DELETE helpers for one Firestore collection.
// Optional `constraint` = [field, op, value] to read only matching documents (e.g. a cashier's own remittances).
export default function useCollection(name, constraint = null) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const key = constraint ? constraint.join("|") : "";

  useEffect(() => {
    const source = constraint ? query(collection(db, name), where(...constraint)) : collection(db, name);
    const unsub = onSnapshot(source,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        rows.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setItems(rows); setLoading(false);
      },
      (e) => { setError(e.message); setLoading(false); });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, key]);

  return {
    items, loading, error,
    add: (data) => addDoc(collection(db, name), { ...data, createdAt: serverTimestamp() }),
    update: (id, data) => updateDoc(doc(db, name, id), data),
    remove: (id) => deleteDoc(doc(db, name, id)),
  };
}
