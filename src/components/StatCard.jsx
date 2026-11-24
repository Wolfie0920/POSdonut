import { Link } from "react-router-dom";

// Summary card: label, big value and a chart (children). With `to` it is a link to that page; without, a plain card.
export default function StatCard({ label, value, to, tone = "", children }) {
  const inner = (
    <>
      <div className="stat-top"><span>{label}</span>{to && <small>Open</small>}</div>
      <strong className="stat-value">{value}</strong>
      {children}
    </>
  );
  return to ? <Link to={to} className={`stat-card ${tone}`}>{inner}</Link> : <div className={`stat-card static ${tone}`}>{inner}</div>;
}
