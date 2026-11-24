import { useState } from "react";
import { peso, pesoShort } from "../utils";

const R = 40, C = 2 * Math.PI * R;

// Donut graph. Hover or focus a slice (or its legend row) to see its name and amount in the centre.
// segments: [{ label, value, color }]. `format` formats legend values; `centerValue`/`centerLabel` show when nothing is hovered.
export default function DonutChart({ segments, centerValue, centerLabel, format = peso, empty = "No data yet" }) {
  const [hover, setHover] = useState(null);
  const total = segments.reduce((s, x) => s + x.value, 0);
  const active = hover !== null ? segments[hover] : null;
  let offset = 0;

  return (
    <div className="donut">
      <svg viewBox="0 0 100 100" role="group" aria-label={centerLabel}>
        <circle cx="50" cy="50" r={R} className="ring-bg" />
        {total > 0 && segments.map((s, i) => {
          const len = (s.value / total) * C;
          const el = (
            <circle key={s.label} cx="50" cy="50" r={R} fill="none" stroke={s.color} className="slice"
              strokeWidth={hover === i ? 15 : 11} strokeDasharray={`${Math.max(len - 0.8, 0)} ${C - len + 0.8}`} strokeDashoffset={-offset}
              transform="rotate(-90 50 50)" tabIndex={0} aria-label={`${s.label}: ${format(s.value)}`}
              opacity={hover === null || hover === i ? 1 : 0.35}
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)} onBlur={() => setHover(null)} />
          );
          offset += len;
          return el;
        })}
        <text x="50" y="49" className="c-value">{active ? pesoShort(active.value) : centerValue}</text>
        <text x="50" y="60" className="c-label">{active ? active.label : centerLabel}</text>
      </svg>
      {total === 0 ? <p className="donut-empty">{empty}</p> : (
        <ul className="legend">
          {segments.map((s, i) => (
            <li key={s.label} className={hover === i ? "on" : ""} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <i style={{ background: s.color }} /><span>{s.label}</span>
              <b>{Math.round((s.value / total) * 100)}%</b>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
