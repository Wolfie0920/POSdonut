import { useState } from "react";
import CrudPage from "../components/CrudPage";
import DonutChart from "../components/DonutChart";
import StatCard from "../components/StatCard";
import useCollection from "../hooks/useCollection";
import { MEASURES, adjustStock, findOrCreateIngredient } from "../inventory";
import { PERIODS, inRange, num, peso, pesoShort } from "../utils";

const CAT_COLORS = { Ingredients: "#2f4b6e", Utilities: "#2a9d8f", Rent: "#e9a23b", Supplies: "#d1495b", Transport: "#7b6cc6", Other: "#9aa5b1" };
const CATEGORIES = Object.keys(CAT_COLORS);
const OPTIONS = CATEGORIES.map((c) => ({ value: c, label: c }));
const PALETTE = ["#2f4b6e", "#2a9d8f", "#e9a23b", "#d1495b", "#7b6cc6", "#9aa5b1"];
const isIng = (v) => v.category === "Ingredients";
const sum = (rows) => rows.reduce((s, r) => s + (r.amount || 0), 0);

// Expenses: dashboard-style summary on top (period, charts, category filter), full list below.
// Category "Ingredients" automatically adds the bought quantity to Inventory (e.g. Flour · 1 kg · 5 qty · ₱100).
export default function Expenses() {
  const inventory = useCollection("inventory").items;
  const [period, setPeriod] = useState("month");
  const [cat, setCat] = useState("All");
  const [, label, days] = PERIODS.find((p) => p[0] === period);
  const inPeriod = (rows) => rows.filter((r) => inRange(r, days));

  const summary = (all) => {
    const rows = inPeriod(all);
    const total = sum(rows);
    const byCat = CATEGORIES.map((c) => ({ label: c, value: sum(rows.filter((r) => r.category === c)), color: CAT_COLORS[c] })).filter((s) => s.value > 0);
    const names = {};
    rows.filter((r) => r.inventoryId).forEach((r) => { names[r.ingredientName] = (names[r.ingredientName] || 0) + r.amount; });
    const sorted = Object.entries(names).sort((a, b) => b[1] - a[1]);
    const rest = sorted.slice(5).reduce((s, [, v]) => s + v, 0);
    const byIng = sorted.slice(0, 5).map(([l, v], i) => ({ label: l, value: v, color: PALETTE[i] }));
    if (rest > 0) byIng.push({ label: "Other", value: rest, color: PALETTE[5] });
    const biggest = rows.reduce((b, r) => (!b || r.amount > b.amount ? r : b), null);
    const top = [...byCat].sort((a, b) => b.value - a.value)[0];

    return (
      <>
        <div className="seg period" role="group" aria-label="Time period">
          {PERIODS.map(([key, text]) => <button key={key} className={period === key ? "on" : ""} aria-pressed={period === key} onClick={() => setPeriod(key)}>{text}</button>)}
        </div>
        <div className="cards">
          <StatCard label={`Total expenses · ${label}`} value={peso(total)}>
            <DonutChart segments={byCat} centerValue={pesoShort(total)} centerLabel="spent" empty="No expenses in this period" />
          </StatCard>
          <StatCard label="Ingredient spending" value={peso(sum(rows.filter((r) => r.inventoryId)))}>
            <DonutChart segments={byIng} centerValue={pesoShort(sum(rows.filter((r) => r.inventoryId)))} centerLabel="ingredients" empty="No ingredient purchases" />
          </StatCard>
          <StatCard label="Quick facts" value={`${rows.length} ${rows.length === 1 ? "entry" : "entries"}`}>
            <ul className="rows facts">
              <li><span>Average per entry</span><b>{peso(rows.length ? total / rows.length : 0)}</b></li>
              <li><span>Biggest expense</span><b>{biggest ? peso(biggest.amount) : "—"}</b></li>
              <li><span>Biggest category</span><b>{top ? top.label : "—"}</b></li>
            </ul>
          </StatCard>
        </div>
        <div className="filters" role="group" aria-label="Filter by category">
          {["All", ...CATEGORIES].map((c) => (
            <button key={c} className={cat === c ? "on" : ""} aria-pressed={cat === c} onClick={() => setCat(c)}>
              {c !== "All" && <i style={{ background: CAT_COLORS[c] }} />}{c}
            </button>
          ))}
        </div>
      </>
    );
  };

  return <CrudPage title="Expenses" collectionName="expenses"
    fields={[
      { name: "category", label: "Category", type: "select", options: OPTIONS },
      { name: "ingredientName", label: "Ingredient name (e.g. Flour)", showIf: isIng },
      { name: "unit", label: "Measure", type: "select", options: MEASURES, showIf: isIng },
      { name: "packSize", label: (v) => `Size of each (${v.unit || "kg"})`, type: "number", showIf: isIng },
      { name: "qty", label: "Quantity bought (qty)", type: "number", showIf: isIng },
      { name: "price", label: "Price each (₱)", type: "number", showIf: isIng },
      { name: "description", label: "Description", showIf: (v) => !isIng(v) },
      { name: "amount", label: "Amount (₱)", type: "number", showIf: (v) => !isIng(v) },
    ]}
    summary={summary}
    rowFilter={(rows) => inPeriod(rows).filter((r) => cat === "All" || r.category === cat)}
    formHint={(v) => isIng(v) && v.ingredientName && v.qty > 0 && v.packSize > 0
      ? `${v.ingredientName}: ${num(v.packSize)} ${v.unit} × ${num(v.qty)} qty = ${num(v.packSize * v.qty)} ${v.unit} added to Inventory. Total cost ${peso(v.qty * (v.price || 0))}.` : null}
    beforeSave={async (d) => {
      if (d.category !== "Ingredients") return d;
      if (!(d.qty > 0) || !(d.packSize > 0)) throw new Error("Size and quantity must be more than 0.");
      const inventoryId = await findOrCreateIngredient(inventory, { name: d.ingredientName, unit: d.unit, packSize: d.packSize, price: d.price });
      return { ...d, description: d.ingredientName, inventoryId, addedAmount: d.qty, amount: d.qty * d.price };
    }}
    afterCreate={(d) => d.inventoryId && adjustStock(d.inventoryId, d.addedAmount)}
    afterDelete={(r) => r.inventoryId && adjustStock(r.inventoryId, -(r.addedAmount ?? r.qty))}
    canEdit={(r) => !r.inventoryId}
    columns={[
      { key: "date", label: "Date", render: (r) => r.createdAt?.toDate?.().toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) ?? "…" },
      { key: "category", label: "Category", render: (r) => <span className="cat"><i style={{ background: CAT_COLORS[r.category] || "#9aa5b1" }} />{r.category}</span> },
      { key: "description", label: "Details", render: (r) => !r.inventoryId ? r.description
          : <div className="line"><b>{r.ingredientName}</b><span>{num(r.packSize)} {r.unit}</span><span>{num(r.qty)} qty</span><span>{peso(r.price)} each</span></div> },
      { key: "amount", label: "Total", render: (r) => <b className="money">{peso(r.amount)}</b> }]} />;
}
