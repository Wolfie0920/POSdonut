import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import useCollection from "../hooks/useCollection";
import { useAuth } from "../context/AuthContext";
import { isProduct } from "../inventory";
import { placeOrder } from "../orders";
import ProductTile from "../components/ProductTile";
import CartPanel from "../components/CartPanel";
import ReceiptModal from "../components/ReceiptModal";
import StatusMessage from "../components/StatusMessage";

// POS screen: staff add products to the customer's order and place it.
export default function Products() {
  const { items, loading, error } = useCollection("inventory");
  const { user } = useAuth();
  const products = useMemo(() => items.filter(isProduct), [items]);
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState("");
  const [method, setMethod] = useState("Cash");
  const [cash, setCash] = useState("");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [receipt, setReceipt] = useState(null);

  const stockOf = (id) => products.find((p) => p.id === id)?.stock ?? 0;
  const total = cart.reduce((s, l) => s + l.price * l.qty, 0);

  // Live stock: if another employee sells something, keep this cart within what is really left.
  useEffect(() => {
    setCart((c) => c.map((l) => {
      const p = products.find((x) => x.id === l.id);
      return p ? { ...l, price: p.price, qty: Math.min(l.qty, p.stock) } : { ...l, qty: 0 };
    }).filter((l) => l.qty > 0));
  }, [products]);

  const add = (p) => setCart((c) => {
    const line = c.find((l) => l.id === p.id);
    if (!line) return [...c, { id: p.id, name: p.name, price: p.price, qty: 1 }];
    return c.map((l) => (l.id === p.id ? { ...l, qty: Math.min(l.qty + 1, p.stock) } : l));
  });
  const changeQty = (id, d) => setCart((c) => c.map((l) => (l.id === id ? { ...l, qty: Math.min(Math.max(l.qty + d, 0), stockOf(id)) } : l)).filter((l) => l.qty > 0));
  const reset = () => { setCart([]); setCustomer(""); setCash(""); setReference(""); setMethod("Cash"); setMsg({ type: "", text: "" }); };

  const checkout = async () => {
    setBusy(true); setMsg({ type: "", text: "" });
    try {
      const result = await placeOrder({ cart, customer: customer.trim(), method, reference: reference.trim(), cash: Number(cash), takenBy: (user?.email || "").split("@")[0] });
      setReceipt(result); reset();
    } catch (e) { setMsg({ type: "error", text: e.message }); }
    setBusy(false);
  };

  const shown = products.filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => (b.stock > 0) - (a.stock > 0) || a.name.localeCompare(b.name));

  return (
    <section>
      <header className="page-head"><h1>Products</h1>
        <input className="search" type="search" placeholder="Search products" aria-label="Search products" value={query} onChange={(e) => setQuery(e.target.value)} /></header>
      <StatusMessage type="error">{error}</StatusMessage>
      <div className="pos">
        <div>
          {loading ? <p className="status">Loading…</p> : products.length === 0 ? (
            <p className="empty">No products yet. Add a Product in <Link to="/inventory">Inventory</Link>, then make some in <Link to="/production">Production</Link>.</p>
          ) : shown.length === 0 ? <p className="empty">No product matches “{query}”.</p> : (
            <div className="tiles">{shown.map((p) => (
              <ProductTile key={p.id} product={p} inCart={cart.find((l) => l.id === p.id)?.qty || 0} onAdd={add} />
            ))}</div>
          )}
        </div>
        <CartPanel cart={cart} stockOf={stockOf} total={total} onQty={changeQty} onRemove={(id) => changeQty(id, -9999)} onClear={reset}
          customer={customer} setCustomer={setCustomer} method={method} setMethod={setMethod} cash={cash} setCash={setCash} reference={reference} setReference={setReference}
          busy={busy} msg={msg} onCheckout={checkout} />
      </div>
      {receipt && <ReceiptModal order={receipt} heading="Order placed" closeLabel="New order" onClose={() => setReceipt(null)} />}
    </section>
  );
}
