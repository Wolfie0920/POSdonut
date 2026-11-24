import { useState } from "react";
import useCollection from "../hooks/useCollection";
import { useAuth } from "../context/AuthContext";
import { voidOrder } from "../orders";
import { PAYMENT_METHODS } from "../config";
import ReceiptModal from "../components/ReceiptModal";
import StatusMessage from "../components/StatusMessage";
import { isToday, num, peso } from "../utils";

// Every order placed from the POS screen, live. Anyone can view/reprint a receipt; only the owner can void.
export default function Orders() {
  const { items, loading, error } = useCollection("orders");
  const { isOwner } = useAuth();
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [receipt, setReceipt] = useState(null);
  const today = items.filter(isToday);
  const byMode = PAYMENT_METHODS.map((m) => ({ name: m.name, total: today.filter((o) => o.method === m.name).reduce((s, o) => s + o.total, 0) })).filter((m) => m.total > 0);

  const doVoid = async (o) => {
    if (!window.confirm(`Void ${o.orderNo}? The sales are removed and the stock is put back.`)) return;
    try { await voidOrder(o); setMsg({ type: "success", text: `${o.orderNo} voided.` }); }
    catch (e) { setMsg({ type: "error", text: e.message }); }
  };

  return (
    <section>
      <header className="page-head"><h1>Orders</h1></header>
      <p className="note">{today.length} orders today · {peso(today.reduce((s, o) => s + o.total, 0))}</p>
      {byMode.length > 0 && <div className="chips" aria-label="Today by mode of payment">{byMode.map((m) => <span key={m.name} className="chip">{m.name} <b>{peso(m.total)}</b></span>)}</div>}
      <StatusMessage type={msg.type}>{msg.text}</StatusMessage>
      <StatusMessage type="error">{error}</StatusMessage>
      {loading ? <p className="status">Loading…</p> : items.length === 0 ? <p className="empty">No orders yet. Orders placed on the Products screen appear here.</p> : (
        <div className="table-wrap"><table>
          <thead><tr><th>Order</th><th>Items</th><th>Total</th><th>Mode of payment</th><th>Taken by</th><th>Actions</th></tr></thead>
          <tbody>{items.map((o) => (
            <tr key={o.id}>
              <td data-label="Order"><div className="stock"><strong>{o.orderNo}</strong><small>{o.createdAt?.toDate?.().toLocaleString() ?? "…"}{o.customer ? ` · ${o.customer}` : ""}</small>{o.remittanceId && <span className="pill ok">Remitted</span>}</div></td>
              <td data-label="Items">{o.items.map((l) => `${l.itemName} × ${num(l.qty)}`).join(", ")}</td>
              <td data-label="Total">{peso(o.total)}</td>
              <td data-label="Payment"><div className="stock"><strong>{o.method}</strong>
                <small>{o.method === "Cash" ? `Change ${peso(o.change)}` : o.reference ? `Ref ${o.reference}` : ""}</small></div></td>
              <td data-label="Taken by">{o.takenBy || "—"}</td>
              <td className="actions">
                <button className="btn small" onClick={() => setReceipt(o)}>Receipt</button>
                {isOwner && !o.remittanceId && <button className="btn small danger" onClick={() => doVoid(o)}>Void</button>}
              </td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
      {receipt && <ReceiptModal order={receipt} onClose={() => setReceipt(null)} />}
    </section>
  );
}
