import { useState } from "react";
import { Link } from "react-router-dom";
import useCollection from "../hooks/useCollection";
import StatCard from "../components/StatCard";
import DonutChart from "../components/DonutChart";
import StatusMessage from "../components/StatusMessage";
import { isToday, num, peso, pesoShort, stockStatus } from "../utils";

const COLORS = ["#2f4b6e", "#2a9d8f", "#e9a23b", "#d1495b", "#7b6cc6", "#9aa5b1"];
const PERIODS = [["today", "Today", 1], ["week", "7 days", 7], ["month", "30 days", 30], ["all", "All time", null]];
const when = (r) => r.createdAt?.toDate?.() ?? new Date();
const inRange = (r, days) => days === null || (days === 1 ? isToday(r) : Date.now() - when(r) <= days * 864e5);
const sum = (rows, f) => rows.reduce((s, r) => s + (f(r) || 0), 0);

// Group rows into the biggest 4 slices plus "Other".
function group(rows, keyFn, valFn) {
  const m = {};
  rows.forEach((r) => { const k = keyFn(r) || "Other"; m[k] = (m[k] || 0) + (valFn(r) || 0); });
  const sorted = Object.entries(m).sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, 4), rest = sorted.slice(4).reduce((s, [, v]) => s + v, 0);
  if (rest > 0) top.push(["Other", rest]);
  return top.map(([label, value], i) => ({ label, value, color: COLORS[i % COLORS.length] }));
}

export default function Dashboard() {
  const sales = useCollection("sales");
  const expenses = useCollection("expenses");
  const payroll = useCollection("payroll").items;   // owner only; empty for employees
  const machines = useCollection("machines").items;
  const production = useCollection("production").items;
  const inventory = useCollection("inventory").items;

  const [period, setPeriod] = useState("today");
  const [goal, setGoal] = useState(() => { try { return Number(localStorage.getItem("posGoal")) || 1000; } catch { return 1000; } });
  const [, label, days] = PERIODS.find((p) => p[0] === period);
  const loading = sales.loading || expenses.loading;

  const S = sales.items.filter((r) => inRange(r, days));
  const E = expenses.items.filter((r) => inRange(r, days));
  const revenue = sum(S, (r) => r.total);
  const expenseTotal = sum(E, (r) => r.amount);
  const costParts = [
    { label: "Expenses", value: expenseTotal, color: COLORS[0] },
    { label: "Payroll", value: sum(payroll.filter((r) => inRange(r, days)), (r) => (r.net || 0) + (r.advanceDeduction || 0)), color: COLORS[2] },
    { label: "Machines", value: sum(machines.filter((r) => inRange(r, days)), (r) => r.cost), color: COLORS[3] },
  ].filter((p) => p.value > 0);
  const totalCost = sum(costParts, (p) => p.value);
  const profit = revenue - totalCost;

  const soldToday = sum(sales.items.filter(isToday), (r) => r.total);
  const pct = goal > 0 ? Math.min(Math.round((soldToday / goal) * 100), 100) : 0;
  const changeGoal = (e) => { const v = Number(e.target.value) || 0; setGoal(v); try { localStorage.setItem("posGoal", v); } catch { /* ignore */ } };

  const lowStock = inventory.filter((i) => stockStatus(i) !== "ok");
  const recovered = (id) => sum(production.filter((p) => p.machineId === id), (p) => p.outputValue);
  const ph = <p className="donut-empty">Loading…</p>;

  return (
    <section className="dash">
      <header className="dash-head">
        <div>
          <h1>Dashboard</h1>
          <p className={`profit ${profit < 0 ? "loss" : "gain"}`}>
            Net profit ({label.toLowerCase()}): <b>{peso(profit)}</b>
            <small> revenue minus all costs</small>
          </p>
        </div>
        <div className="controls">
          <div className="seg" role="group" aria-label="Time period">
            {PERIODS.map(([key, text]) => (
              <button key={key} aria-pressed={period === key} className={period === key ? "on" : ""} onClick={() => setPeriod(key)}>{text}</button>
            ))}
          </div>
          <label className="goal">Daily goal ₱<input type="number" min="0" value={goal} onChange={changeGoal} aria-label="Daily sales goal" /></label>
        </div>
      </header>

      <StatusMessage type="error">{sales.error || expenses.error}</StatusMessage>

      <div className="cards">
        <StatCard label={`Expense · ${label}`} value={peso(expenseTotal)} to="/expenses">
          {loading ? ph : <DonutChart segments={group(E, (r) => r.category, (r) => r.amount)} centerValue={pesoShort(expenseTotal)} centerLabel="spent" empty="No expenses in this period" />}
        </StatCard>
        <StatCard label={`Total expense · ${label}`} value={peso(totalCost)} to="/expenses">
          {loading ? ph : <DonutChart segments={costParts} centerValue={pesoShort(totalCost)} centerLabel="all costs" empty="No costs in this period" />}
        </StatCard>
        <StatCard label={`Revenue · ${label}`} value={peso(revenue)} to="/sales">
          {loading ? ph : <DonutChart segments={group(S, (r) => r.itemName, (r) => r.total)} centerValue={pesoShort(revenue)} centerLabel="earned" empty="No sales in this period" />}
        </StatCard>
        <StatCard label="Total sales today" value={peso(soldToday)} to="/sales" tone="good">
          {loading ? ph : <DonutChart
            segments={[{ label: "Sold", value: soldToday, color: "#2c7a4b" }, { label: "Left to goal", value: Math.max(goal - soldToday, 0), color: "#b8c2ce" }]}
            centerValue={`${pct}%`} centerLabel={pct >= 100 ? "goal reached" : "of daily goal"} />}
        </StatCard>
      </div>

      <div className="panels">
        <div className="panel">
          <h2>Recent sales</h2>
          {sales.items.length === 0 ? <p className="empty-s">No sales yet. <Link to="/sales">Record the first sale</Link></p> : (
            <ul className="rows">{sales.items.slice(0, 5).map((r) => (
              <li key={r.id}><span>{r.itemName} <small>× {num(r.qty)}</small></span><b>{peso(r.total)}</b></li>
            ))}</ul>
          )}
        </div>
        <div className="panel">
          <h2>Low stock</h2>
          {lowStock.length === 0 ? <p className="empty-s">All stock levels look good.</p> : (
            <ul className="rows">{lowStock.slice(0, 6).map((i) => (
              <li key={i.id}><Link to="/inventory">{i.name}</Link>
                <span><small>{num(i.stock)} qty </small><i className={`pill ${stockStatus(i)}`}>{stockStatus(i) === "out" ? "Out" : "Low"}</i></span></li>
            ))}</ul>
          )}
        </div>
        <div className="panel">
          <h2>Machine payback</h2>
          {machines.length === 0 ? <p className="empty-s">No machines added yet.</p> : (
            <ul className="rows roi">{machines.slice(0, 5).map((m) => {
              const p = m.cost > 0 ? Math.round((recovered(m.id) / m.cost) * 100) : 0;
              return (
                <li key={m.id}><span>{m.name}</span><b className={p >= 100 ? "good-text" : ""}>{p >= 100 ? "ROI reached" : `${p}% recovered`}</b>
                  <div className="bar" aria-hidden="true"><span style={{ width: `${Math.min(p, 100)}%` }} /></div></li>
              );
            })}</ul>
          )}
        </div>
      </div>
    </section>
  );
}
