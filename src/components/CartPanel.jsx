import { PAYMENT_METHODS } from "../config";
import { num, peso } from "../utils";
import ProductImage from "./ProductImage";
import StatusMessage from "./StatusMessage";

// Order cart: items with +/- controls, customer, mode of payment, and the Place order button.
export default function CartPanel({ cart, stockOf, total, onQty, onRemove, onClear, customer, setCustomer, method, setMethod, cash, setCash, reference, setReference, busy, msg, onCheckout }) {
  const cashNum = Number(cash);
  const change = cashNum - total;
  const mode = PAYMENT_METHODS.find((m) => m.name === method);
  const quick = [...new Set([total, Math.ceil(total / 100) * 100, Math.ceil(total / 500) * 500, Math.ceil(total / 1000) * 1000])].filter((v) => v >= total && v > 0).slice(0, 4);
  const paymentOk = method === "Cash" ? cashNum >= total : reference.trim() !== "";
  const canPay = cart.length > 0 && paymentOk;
  const count = cart.reduce((s, l) => s + l.qty, 0);

  return (
    <aside className="cart" aria-label="Current order">
      <div className="cart-head"><h2>Current order <span className="count">{count}</span></h2>
        {cart.length > 0 && <button className="link" onClick={onClear}>Clear</button>}</div>

      {cart.length === 0 ? <p className="empty-s">Tap a product to add it to the order.</p> : (
        <ul className="lines">{cart.map((l) => (
          <li key={l.id}>
            <div className="who-line"><ProductImage name={l.name} size={40} /><div><strong>{l.name}</strong><small>{peso(l.price)} each</small></div></div>
            <div className="qty">
              <button aria-label={`Less ${l.name}`} onClick={() => onQty(l.id, -1)}>−</button>
              <span>{num(l.qty)}</span>
              <button aria-label={`More ${l.name}`} onClick={() => onQty(l.id, 1)} disabled={l.qty >= stockOf(l.id)}>+</button>
            </div>
            <b>{peso(l.price * l.qty)}</b>
            <button className="x" aria-label={`Remove ${l.name}`} onClick={() => onRemove(l.id)}>×</button>
          </li>
        ))}</ul>
      )}

      <label className="field"><span>Customer name (optional)</span>
        <input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Walk-in customer" /></label>

      <fieldset className="methods"><legend>Mode of payment</legend>
        {PAYMENT_METHODS.map((m) => (
          <button key={m.name} type="button" className={method === m.name ? "on" : ""} aria-pressed={method === m.name} onClick={() => setMethod(m.name)}>{m.name}</button>
        ))}
      </fieldset>

      {method === "Cash" ? (
        <div className="cash">
          <label className="field"><span>Cash received (₱)</span>
            <input type="number" min="0" value={cash} onChange={(e) => setCash(e.target.value)} /></label>
          <div className="quick">{quick.map((v) => <button key={v} className="btn ghost small" onClick={() => setCash(String(v))}>{v === total ? "Exact" : peso(v)}</button>)}</div>
        </div>
      ) : (
        <label className="field"><span>{mode.ref}</span>
          <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Required" /></label>
      )}

      <div className="totals">
        <div><span>Total</span><strong>{peso(total)}</strong></div>
        {method === "Cash" && cash !== "" && <div className={change >= 0 ? "ok" : "short"}><span>{change >= 0 ? "Change" : "Short by"}</span><strong>{peso(Math.abs(change))}</strong></div>}
      </div>

      <StatusMessage type={msg.type}>{msg.text}</StatusMessage>
      <button className="btn pay" disabled={!canPay || busy} onClick={onCheckout}>{busy ? "Placing order…" : `Place order · ${peso(total)}`}</button>
    </aside>
  );
}
