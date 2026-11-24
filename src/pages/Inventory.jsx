import { doc, increment, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import CrudPage from "../components/CrudPage";
import useCollection from "../hooks/useCollection";
import ProductImage from "../components/ProductImage";
import { MEASURES, isIngredient } from "../inventory";
import { num, peso, stockStatus } from "../utils";

const isIng = (v) => v.type === "ingredient";

export default function Inventory() {
  const items = useCollection("inventory").items;
  // The same item (name + type; ingredients also size + measure) is never saved twice: new stock is added to the existing record.
  const existing = (v) => v.name && items.find((i) => (i.type || "product") === v.type && i.name.trim().toLowerCase() === String(v.name).trim().toLowerCase()
    && (v.type !== "ingredient" || (i.unit === v.unit && Number(i.packSize) === Number(v.packSize))));

  return <CrudPage title="Inventory" collectionName="inventory"
    fields={[
      { name: "type", label: "Type", type: "select", options: [{ value: "product", label: "Product (for sale)" }, { value: "ingredient", label: "Ingredient" }] },
      { name: "name", label: "Item name" },
      { name: "unit", label: "Measure", type: "select", options: MEASURES, showIf: isIng },
      { name: "packSize", label: (v) => `Size of each (${v.unit || "kg"})`, type: "number", showIf: isIng },
      { name: "stock", label: "Quantity on hand (qty)", type: "number" },
      { name: "price", label: (v) => isIng(v) ? "Price each (₱)" : "Selling price (₱)", type: "number" },
    ]}
    handleCreate={async (d) => {
      const found = existing(d);
      if (!found) return null;
      await updateDoc(doc(db, "inventory", found.id), { stock: increment(d.stock), price: d.price });
      return `Added ${num(d.stock)} to ${found.name}. Stock is now ${num(found.stock + d.stock)}.`;
    }}
    formHint={(v, editingId) => !editingId && existing(v) && v.stock !== "" ? `${existing(v).name} is already in stock (${num(existing(v).stock)}). Saving adds ${num(v.stock)} to it, so the new total is ${num(existing(v).stock + Number(v.stock))}.`
      : isIng(v) && v.packSize > 0 && v.stock !== "" ? `${num(v.packSize)} ${v.unit || ""} × ${num(v.stock)} qty = ${num(v.packSize * v.stock)} ${v.unit || ""} in total.` : null}
    beforeSave={(d) => {
      if (isIng(d) && !(d.packSize > 0)) throw new Error("Size of each must be more than 0.");
      return isIng(d) ? d : { ...d, unit: "pcs" };
    }}
    columns={[
      { key: "name", label: "Item", render: (r) => <div className="who-line">{!isIngredient(r) && <ProductImage name={r.name} size={44} />}<div className="stock"><strong>{r.name}</strong><small>{isIngredient(r) ? "Ingredient" : "Product"}</small></div></div> },
      { key: "size", label: "Size", render: (r) => isIngredient(r) ? `${num(r.packSize)} ${r.unit}` : "—" },
      { key: "stock", label: "Qty", render: (r) => { const st = stockStatus(r);
          return <div className="stock"><strong>{num(r.stock)} qty</strong>{st !== "ok" && <span className={`pill ${st}`}>{st === "out" ? "Out of stock" : "Low stock"}</span>}</div>; } },
      { key: "price", label: "Price", render: (r) => peso(r.price) }]} />;
}
