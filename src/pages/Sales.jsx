import { doc, increment, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import CrudPage from "../components/CrudPage";
import useCollection from "../hooks/useCollection";
import { adjustStock, isProduct } from "../inventory";
import { peso } from "../utils";

// Sales are created automatically by the Products (POS) screen. Manual entry is still possible here.
export default function Sales() {
  const inventory = useCollection("inventory").items.filter(isProduct);
  const options = inventory.map((i) => ({ value: i.id, label: `${i.name} (${i.stock} left)` }));

  return <CrudPage title="Sales" collectionName="sales"
    fields={[{ name: "itemId", label: "Item", type: "select", options }, { name: "qty", label: "Quantity", type: "number" }]}
    beforeSave={(d) => {
      const item = inventory.find((i) => i.id === d.itemId);
      if (!item) throw new Error("Pick an item from inventory.");
      if (d.qty > item.stock) throw new Error(`Only ${item.stock} in stock.`);
      return { ...d, itemName: item.name, unitPrice: item.price, total: item.price * d.qty };
    }}
    afterCreate={(d) => updateDoc(doc(db, "inventory", d.itemId), { stock: increment(-d.qty) })}
    afterDelete={(r) => !r.orderId && adjustStock(r.itemId, r.qty)}
    canEdit={() => false}
    columns={[{ key: "itemName", label: "Item" }, { key: "qty", label: "Qty" },
      { key: "total", label: "Total", render: (r) => peso(r.total) },
      { key: "orderNo", label: "Order", render: (r) => r.orderNo || "Manual" },
      { key: "createdAt", label: "Date", render: (r) => r.createdAt?.toDate?.().toLocaleString() ?? "…" }]}
    summary={(rows) => <p className="note">{rows.length} sales · {peso(rows.reduce((s, r) => s + r.total, 0))} total. Sales from orders are voided on the Orders page.</p>} />;
}
