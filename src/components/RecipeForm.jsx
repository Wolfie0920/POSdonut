import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import StatusMessage from "./StatusMessage";
import { num, peso } from "../utils";

// Create / edit the recipe of one product: "this recipe makes N pieces" using these ingredient amounts.
export default function RecipeForm({ product, ingredients, machines = [], onClose }) {
  const r = product.recipe;
  const [yieldQty, setYield] = useState(r ? String(r.yield) : "");
  const [lines, setLines] = useState(r ? r.lines.map((l) => ({ ingredientId: l.ingredientId, amount: String(l.amount) })) : [{ ingredientId: "", amount: "" }]);
  const [machineId, setMachineId] = useState(r?.machineId || "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const ing = (id) => ingredients.find((i) => i.id === id);
  const setLine = (i, k, v) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, [k]: v } : l)));
  const cost = lines.reduce((s, l) => { const g = ing(l.ingredientId); return g ? s + ((Number(l.amount) || 0) / (g.packSize || 1)) * g.price : s; }, 0);
  const perPiece = Number(yieldQty) > 0 ? cost / Number(yieldQty) : 0;

  const save = async (e) => {
    e.preventDefault(); setError("");
    if (!(Number(yieldQty) > 0)) return setError("Enter how many pieces this recipe makes.");
    if (machines.length > 0 && !machineId) return setError("Choose the machine used to make this product.");
    const ids = lines.map((l) => l.ingredientId);
    if (lines.some((l) => !l.ingredientId || !(Number(l.amount) > 0))) return setError("Every row needs an ingredient and an amount above 0.");
    if (new Set(ids).size !== ids.length) return setError("An ingredient is listed twice. Combine it into one row.");
    setSaving(true);
    try {
      await updateDoc(doc(db, "inventory", product.id), {
        recipe: { yield: Number(yieldQty), machineId, machineName: machines.find((m) => m.id === machineId)?.name || "", lines: lines.map((l) => ({ ingredientId: l.ingredientId, name: ing(l.ingredientId).name, unit: ing(l.ingredientId).unit, amount: Number(l.amount) })) },
      });
      onClose();
    } catch (err) { setError(err.message); setSaving(false); }
  };

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Recipe">
      <form className="card form wide" onSubmit={save} noValidate>
        <h2>Recipe for {product.name}</h2>
        {ingredients.length === 0 && <StatusMessage type="error">No ingredients yet. Add one in Expenses (category Ingredients) first.</StatusMessage>}
        <label className="field"><span>This recipe makes (pieces)</span>
          <input type="number" min="0" value={yieldQty} onChange={(e) => setYield(e.target.value)} placeholder="e.g. 100" /></label>
        <label className="field"><span>Machine used to cook this (Production picks it automatically)</span>
          <select value={machineId} onChange={(e) => setMachineId(e.target.value)}>
            <option value="">{machines.length ? "Select machine…" : "No machines yet (add one in Tax & ROI)"}</option>
            {machines.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select></label>
        <p className="note">Ingredients used to make that many pieces:</p>
        {lines.map((l, i) => (
          <div className="recipe-row" key={i}>
            <select aria-label="Ingredient" value={l.ingredientId} onChange={(e) => setLine(i, "ingredientId", e.target.value)}>
              <option value="">Select ingredient…</option>
              {ingredients.map((g) => <option key={g.id} value={g.id}>{g.name} · {num(g.packSize)} {g.unit} each</option>)}
            </select>
            <input type="number" min="0" step="any" aria-label="Amount" placeholder="Amount" value={l.amount} onChange={(e) => setLine(i, "amount", e.target.value)} />
            <span className="unit">{ing(l.ingredientId)?.unit || ""}</span>
            {lines.length > 1 && <button type="button" className="x" aria-label="Remove ingredient" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}>×</button>}
          </div>
        ))}
        <button type="button" className="btn ghost small" onClick={() => setLines((ls) => [...ls, { ingredientId: "", amount: "" }])}>+ Add ingredient</button>
        {perPiece > 0 && <div className="hint">Ingredient cost: {peso(cost)} per batch · <b>{peso(perPiece)} per piece</b></div>}
        <StatusMessage type="error">{error}</StatusMessage>
        <div className="row">
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={saving}>{saving ? "Saving…" : "Save recipe"}</button>
        </div>
      </form>
    </div>
  );
}
