import { BUSINESS } from "../config";
import { num, peso } from "../utils";

// Printable receipt. Works for a new order (has `date`) and a saved order (has `createdAt`).
export default function Receipt({ order }) {
  const date = order.createdAt?.toDate?.() ?? order.date ?? new Date();
  return (
    <div className="print-area receipt-paper">
      <header>
        <h3>{BUSINESS.name}</h3>
        <p>{BUSINESS.address}</p>
        <p>{BUSINESS.phone}</p>
      </header>
      <dl className="meta">
        <div><dt>Receipt no.</dt><dd>{order.orderNo}</dd></div>
        <div><dt>Date</dt><dd>{date.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}</dd></div>
        <div><dt>Cashier</dt><dd>{order.takenBy || "—"}</dd></div>
        {order.customer && <div><dt>Customer</dt><dd>{order.customer}</dd></div>}
      </dl>
      <ul className="r-items">
        {order.items.map((l) => (
          <li key={l.itemId}>
            <span><b>{l.itemName}</b><small>{num(l.qty)} × {peso(l.unitPrice)}</small></span>
            <span>{peso(l.total)}</span>
          </li>
        ))}
      </ul>
      <dl className="meta totals-r">
        <div className="grand"><dt>TOTAL</dt><dd>{peso(order.total)}</dd></div>
        <div><dt>Payment mode</dt><dd>{order.method}</dd></div>
        {order.reference && <div><dt>Reference no.</dt><dd>{order.reference}</dd></div>}
        <div><dt>{order.method === "Cash" ? "Cash received" : "Amount paid"}</dt><dd>{peso(order.paid)}</dd></div>
        <div><dt>Change</dt><dd>{peso(order.change)}</dd></div>
      </dl>
      <p className="thanks">{BUSINESS.footer}</p>
    </div>
  );
}
