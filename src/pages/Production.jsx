import { doc, increment, writeBatch } from "firebase/firestore";
import { db } from "../firebase";
import CrudPage from "../components/CrudPage";
import useCollection from "../hooks/useCollection";
import { adjustMany, isIngredient, isProduct } from "../inventory";
import { num, peso } from "../utils";

const recoveredBy = (rows, id) => rows.filter((x) => x.machineId === id).reduce((s, x) => s + (x.outputValue || 0), 0);

// Making N pieces uses the product's recipe: every ingredient is deducted in proportion (N ÷ batch size),
// the pieces are added to stock, and the machine's cost is paid back by the value of what was made.
export default function Production() {
  const machines = useCollection("machines").items;
  const inventory = useCollection("inventory").items;
  const runs = useCollection("production").items;
  const products = inventory.filter(isProduct);
  const ingredients = inventory.filter(isIngredient);

  // What a run of n pieces of a product would use.
  const plan = (productId, n) => {
    const p = products.find((i) => i.id === productId);
    if (!p?.recipe || !(n > 0)) return null;
    const usage = p.recipe.lines.map((l) => {
      const g = ingredients.find((i) => i.id === l.ingredientId);
      const size = g?.packSize || 1;
      const amount = (l.amount * n) / p.recipe.yield;
      return { ingredientId: l.ingredientId, name: l.name, unit: l.unit, amount, qty: amount / size, leftQty: g?.stock ?? 0, leftAmount: (g?.stock ?? 0) * size, missing: !g, price: g?.price || 0 };
    });
    return { p, usage, cost: usage.reduce((s, u) => s + u.qty * u.price, 0) };
  };

  const hint = (v) => {
    const p = products.find((i) => i.id === v.itemId);
    if (p && !p.recipe) return `${p.name} has no recipe yet. Ask the owner to set it on the Recipes page.`;
    const pl = plan(v.itemId, Number(v.qty));
    if (!pl) return null;
    const m = machines.find((x) => x.id === pl.p.recipe.machineId);
    const gain = Number(v.qty) * (pl.p.price || 0);
    const left = m ? Math.max(m.cost - recoveredBy(runs, m.id), 0) : 0;
    return (
      <>
        <b>Ingredients for {num(v.qty)} {pl.p.name}</b>
        <ul className="need">{pl.usage.map((u) => (
          <li key={u.ingredientId} className={u.missing || u.qty > u.leftQty + 1e-9 ? "short" : ""}>
            {u.name}: {num(u.amount)} {u.unit} <small>({num(u.leftAmount)} {u.unit} in stock)</small>
          </li>
        ))}</ul>
        Ingredient cost {peso(pl.cost)}.
        {!m && <><br />No machine is set on this recipe, so no machine payback is counted. Edit the recipe to add one.</>}
        {m && <><br />Machine {m.name} (automatic): {peso(left)} left to pay back. This run adds {peso(gain)}{left - gain <= 0 ? ", so the machine is paid back." : `, leaving ${peso(left - gain)}.`}</>}
      </>
    );
  };

  const summary = (rows) => machines.length > 0 && (
    <div className="machine-strip">{machines.map((m) => {
      const rec = recoveredBy(rows, m.id), pct = m.cost > 0 ? Math.min(Math.round((rec / m.cost) * 100), 100) : 0;
      return (
        <div className="chip-card" key={m.id}>
          <span>{m.name}</span>
          <b className={pct >= 100 ? "good-text" : ""}>{pct >= 100 ? "Paid back" : `${peso(Math.max(m.cost - rec, 0))} left`}</b>
          <div className="bar" aria-hidden="true"><span style={{ width: `${pct}%` }} /></div>
        </div>
      );
    })}</div>
  );

  return <CrudPage title="Production" collectionName="production"
    fields={[
      { name: "itemId", label: "Product made", type: "select", options: products.map((i) => ({ value: i.id, label: i.recipe ? i.name : `${i.name} (no recipe)` })) },
      { name: "qty", label: "Quantity produced (pieces)", type: "number" },
    ]}
    formHint={hint}
    summary={summary}
    beforeSave={(d) => {
      const p = products.find((i) => i.id === d.itemId);
      if (!(d.qty > 0)) throw new Error("Quantity produced must be more than 0.");
      if (!p?.recipe) throw new Error(`${p?.name || "This product"} has no recipe yet. Ask the owner to set it on the Recipes page.`);
      const pl = plan(d.itemId, d.qty);
      const short = pl.usage.filter((u) => u.missing || u.qty > u.leftQty + 1e-9);
      if (short.length) throw new Error(short.map((u) => `Not enough ${u.name}: need ${num(u.amount)} ${u.unit}, have ${num(u.leftAmount)} ${u.unit}.`).join(" "));
      const m = machines.find((x) => x.id === p.recipe.machineId);
      return { ...d, machineId: p.recipe.machineId || "", itemName: p.name, machineName: m?.name || "—", outputValue: d.qty * (p.price || 0), ingredientCost: pl.cost,
        usage: pl.usage.map(({ ingredientId, name, unit, amount, qty }) => ({ ingredientId, name, unit, amount, qty })) };
    }}
    afterCreate={async (d) => {
      const b = writeBatch(db);
      b.update(doc(db, "inventory", d.itemId), { stock: increment(d.qty) });
      d.usage.forEach((u) => b.update(doc(db, "inventory", u.ingredientId), { stock: increment(-u.qty) }));
      await b.commit();
    }}
    afterDelete={(r) => adjustMany([
      [r.itemId, -r.qty],
      ...(r.usage || []).map((u) => [u.ingredientId, u.qty]),
      ...(!r.usage && r.ingredientId ? [[r.ingredientId, r.ingredientQty]] : []),
    ])}
    canEdit={() => false}
    columns={[{ key: "machineName", label: "Machine" }, { key: "itemName", label: "Product" }, { key: "qty", label: "Made" },
      { key: "usage", label: "Ingredients used", render: (r) => r.usage ? r.usage.map((u) => `${u.name} ${num(u.amount)} ${u.unit}`).join(", ") : (r.ingredientName ? `${r.ingredientName} ${num(r.ingredientQty)} qty` : "—") },
      { key: "ingredientCost", label: "Ingredient cost", render: (r) => peso(r.ingredientCost) },
      { key: "outputValue", label: "Output value", render: (r) => peso(r.outputValue) }]} />;
}
