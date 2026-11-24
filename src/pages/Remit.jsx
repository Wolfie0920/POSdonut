import { useState } from "react";
import CashCounter from "../components/CashCounter";
import DonutChart from "../components/DonutChart";
import StatCard from "../components/StatCard";
import StatusMessage from "../components/StatusMessage";
import useCollection from "../hooks/useCollection";
import { useAuth } from "../context/AuthContext";
import { PAYMENT_METHODS } from "../config";
import { createRemittance, voidRemittance } from "../remit";
import { peso, pesoShort } from "../utils";

const COLORS = { Cash: "#2c7a4b", GCash: "#2f6fd1", Maya: "#2a9d8f", Card: "#7b6cc6", "Bank transfer": "#e9a23b" };
const verdict = (v) => (v === 0 ? { text: "Exact", cls: "ok" } : v > 0 ? { text: `Over ${peso(v)}`, cls: "over" } : { text: `Short ${peso(-v)}`, cls: "out" });
const sum = (rows, f) => rows.reduce((s, r) => s + (f(r) || 0), 0);

// End-of-shift remittance: hand over the sales and compare the cash that should be on hand with the cash actually counted.
export default function Remit() {
  const { user, isOwner } = useAuth();
  const me = (user?.email || "").split("@")[0];
  const orders = useCollection("orders");
  const remits = useCollection("remittances", isOwner ? null : ["cashierUid", "==", user.uid]);
  const [actual, setActual] = useState("");
  const [note, setNote] = useState("");
  const [counting, setCounting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const pending = orders.items.filter((o) => !o.remittanceId);
  const mine = pending.filter((o) => o.takenBy === me);
  const totalSales = sum(mine, (o) => o.total);
  const expected = sum(mine.filter((o) => o.method === "Cash"), (o) => o.total);
  const segments = PAYMENT_METHODS.map((m) => ({ label: m.name, value: sum(mine.filter((o) => o.method === m.name), (o) => o.total), color: COLORS[m.name] })).filter((s) => s.value > 0);
  const hasActual = actual !== "" && Number(actual) >= 0;
  const variance = hasActual ? Math.round((Number(actual) - expected) * 100) / 100 : null;
  const v = variance === null ? null : verdict(variance);
  const needNote = variance !== null && variance !== 0;
  const canSubmit = mine.length > 0 && hasActual && (!needNote || note.trim()) && !busy;

  const owing = [...new Set(pending.map((o) => o.takenBy || "unknown"))].map((c) => {
    const rows = pending.filter((o) => (o.takenBy || "unknown") === c);
    return { cashier: c, count: rows.length, sales: sum(rows, (o) => o.total), cash: sum(rows.filter((o) => o.method === "Cash"), (o) => o.total) };
  });

  const submit = async () => {
    setBusy(true); setMsg({ type: "", text: "" });
    try {
      const r = await createRemittance({ orders: mine, actualCash: Number(actual), note: note.trim(), user });
      setMsg({ type: "success", text: `Remittance saved: ${peso(r.totalSales)} in sales, ${peso(r.actualCash)} cash handed over (${verdict(r.variance).text}).` });
      setActual(""); setNote(""); setCounting(false);
    } catch (e) { setMsg({ type: "error", text: e.message }); }
    setBusy(false);
  };
  const undo = async (r) => {
    if (!window.confirm("Delete this remittance? Its orders can then be remitted again.")) return;
    try { await voidRemittance(r); setMsg({ type: "success", text: "Remittance deleted." }); } catch (e) { setMsg({ type: "error", text: e.message }); }
  };

  return (
    <section>
      <header className="page-head"><h1>Remit cash</h1></header>
      <p className="note">Hand over your sales for <b>{me}</b>: count the cash in your drawer and enter it. The system compares it with the cash sales.</p>
      <StatusMessage type={msg.type}>{msg.text}</StatusMessage>
      <StatusMessage type="error">{orders.error || remits.error}</StatusMessage>

      <div className="cards">
        <StatCard label="Sales to remit" value={peso(totalSales)}>
          <DonutChart segments={segments} centerValue={pesoShort(totalSales)} centerLabel={`${mine.length} orders`} empty="Nothing to remit right now" />
        </StatCard>
        <StatCard label="Cash that should be on hand" value={peso(expected)} tone="good">
          <ul className="rows facts">
            <li><span>Cash counted</span><b>{hasActual ? peso(Number(actual)) : "—"}</b></li>
            <li><span>Difference</span><b className={v ? `v-${v.cls}` : ""}>{v ? v.text : "—"}</b></li>
          </ul>
        </StatCard>
      </div>

      <div className="panel remit-form">
        <h2>Count your cash</h2>
        <label className="field"><span>Actual cash on hand (₱)</span>
          <input type="number" min="0" step="any" value={actual} onChange={(e) => setActual(e.target.value)} placeholder={`Expected ${peso(expected)}`} /></label>
        <button type="button" className="link" onClick={() => setCounting((c) => !c)}>{counting ? "Hide bills & coins" : "Count by bills & coins"}</button>
        {counting && <CashCounter onTotal={(t) => setActual(String(t))} />}
        {needNote && <label className="field"><span>Why is it {variance > 0 ? "over" : "short"}? (required)</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. change given wrong, sale not recorded" /></label>}
        {!needNote && <label className="field"><span>Note (optional)</span><input value={note} onChange={(e) => setNote(e.target.value)} /></label>}
        <button className="btn pay" disabled={!canSubmit} onClick={submit}>{busy ? "Saving…" : `Submit remittance${mine.length ? ` · ${mine.length} orders` : ""}`}</button>
        {mine.length === 0 && <p className="empty-s">You have no unremitted orders.</p>}
      </div>

      {isOwner && owing.length > 0 && (
        <div className="panel"><h2>Not yet remitted</h2>
          <ul className="rows">{owing.map((o) => <li key={o.cashier}><span><b>{o.cashier}</b> <small>{o.count} orders · cash {peso(o.cash)}</small></span><b>{peso(o.sales)}</b></li>)}</ul></div>
      )}

      <h2 className="sec">Remittance history</h2>
      {remits.loading ? <p className="status">Loading…</p> : remits.items.length === 0 ? <p className="empty">No remittances yet.</p> : (
        <div className="table-wrap"><table>
          <thead><tr><th>Date</th><th>Cashier</th><th>Total sales</th><th>Cash expected</th><th>Cash handed over</th><th>Result</th><th>Note</th>{isOwner && <th>Actions</th>}</tr></thead>
          <tbody>{remits.items.map((r) => (
            <tr key={r.id}>
              <td data-label="Date">{r.createdAt?.toDate?.().toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" }) ?? "…"}<small className="sub">{r.orderCount} orders</small></td>
              <td data-label="Cashier">{r.cashier}</td>
              <td data-label="Total sales">{peso(r.totalSales)}</td>
              <td data-label="Cash expected">{peso(r.expectedCash)}</td>
              <td data-label="Cash handed over"><b>{peso(r.actualCash)}</b></td>
              <td data-label="Result"><span className={`pill ${verdict(r.variance).cls}`}>{verdict(r.variance).text}</span></td>
              <td data-label="Note">{r.note || "—"}</td>
              {isOwner && <td className="actions"><button className="btn small danger" onClick={() => undo(r)}>Delete</button></td>}
            </tr>
          ))}</tbody>
        </table></div>
      )}
    </section>
  );
}
