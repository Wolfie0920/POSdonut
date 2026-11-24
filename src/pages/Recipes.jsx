import { useState } from "react";
import { deleteField, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import useCollection from "../hooks/useCollection";
import { isIngredient, isProduct } from "../inventory";
import RecipeForm from "../components/RecipeForm";
import StatusMessage from "../components/StatusMessage";
import { num, peso } from "../utils";

// One recipe per product: how many pieces a batch makes and which ingredients it uses.
export default function Recipes() {
  const { items, loading, error } = useCollection("inventory");
  const products = items.filter(isProduct);
  const ingredients = items.filter(isIngredient);
  const machines = useCollection("machines").items;
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const costPerPiece = (r) => r.lines.reduce((s, l) => { const g = ingredients.find((i) => i.id === l.ingredientId); return g ? s + (l.amount / (g.packSize || 1)) * g.price : s; }, 0) / r.yield;
  const remove = async (p) => {
    if (!window.confirm(`Remove the recipe for ${p.name}?`)) return;
    try { await updateDoc(doc(db, "inventory", p.id), { recipe: deleteField() }); setMsg({ type: "success", text: "Recipe removed." }); }
    catch (e) { setMsg({ type: "error", text: e.message }); }
  };

  return (
    <section>
      <header className="page-head"><h1>Recipes</h1></header>
      <p className="note">Set once how many pieces a batch makes and what it uses. Production then deducts the ingredients for you.</p>
      <StatusMessage type={msg.type}>{msg.text}</StatusMessage>
      <StatusMessage type="error">{error}</StatusMessage>
      {loading ? <p className="status">Loading…</p> : products.length === 0 ? <p className="empty">No products yet. Add a Product in Inventory first.</p> : (
        <div className="panels">{products.map((p) => (
          <div className="panel" key={p.id}>
            <h2>{p.name}</h2>
            {p.recipe ? (
              <>
                <p className="note">Makes <b>{num(p.recipe.yield)}</b> pieces from:</p>
                <ul className="rows">{p.recipe.lines.map((l) => <li key={l.ingredientId}><span>{l.name}</span><b>{num(l.amount)} {l.unit}</b></li>)}</ul>
                <p className="note">Machine: <b>{machines.find((m) => m.id === p.recipe.machineId)?.name || "not set"}</b></p>
                <p className="note">Cost per piece <b>{peso(costPerPiece(p.recipe))}</b> · sells at <b>{peso(p.price)}</b></p>
              </>
            ) : <p className="empty-s">No recipe yet.</p>}
            <div className="row">
              {p.recipe && <button className="btn small danger" onClick={() => remove(p)}>Remove</button>}
              <button className="btn small" onClick={() => setEditing(p)}>{p.recipe ? "Edit recipe" : "Set recipe"}</button>
            </div>
          </div>
        ))}</div>
      )}
      {editing && <RecipeForm key={editing.id} product={editing} ingredients={ingredients} machines={machines} onClose={() => setEditing(null)} />}
    </section>
  );
}
