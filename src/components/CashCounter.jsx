import { useState } from "react";
import { peso } from "../utils";

const DENOMS = [1000, 500, 200, 100, 50, 20, 10, 5, 1];

// Count bills and coins; reports the total so the cashier does not have to add it up by hand.
export default function CashCounter({ onTotal }) {
  const [counts, setCounts] = useState({});
  const total = (c) => DENOMS.reduce((s, d) => s + d * (Number(c[d]) || 0), 0);
  const set = (d, v) => { const c = { ...counts, [d]: v }; setCounts(c); onTotal(total(c)); };
  return (
    <div className="counter" aria-label="Count bills and coins">
      {DENOMS.map((d) => (
        <label key={d}><span>{d >= 20 ? "Bill" : "Coin"} ₱{d}</span>
          <input type="number" min="0" inputMode="numeric" value={counts[d] ?? ""} onChange={(e) => set(d, e.target.value)} placeholder="0" /></label>
      ))}
      <p className="note">Counted: <b>{peso(total(counts))}</b></p>
    </div>
  );
}
