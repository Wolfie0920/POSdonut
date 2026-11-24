import { useState } from "react";
import { balanceOf, byOldest, countWorkDays, createPayroll, fmtDate, round2 } from "../payroll";
import StatusMessage from "./StatusMessage";
import { num, peso } from "../utils";

// Generate payroll: pick the employee and period; absences and cash advances are worked out and deducted automatically.
export default function PayrollForm({ employees, absences, advances, onClose, onSaved }) {
  const [employeeId, setEmployeeId] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [days, setDays] = useState(null);       // null = automatic (Mon–Sat)
  const [deduct, setDeduct] = useState(null);   // null = automatic (everything owed, as far as pay allows)
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const emp = employees.find((e) => e.id === employeeId);
  const rate = emp?.dailyRate || 0;
  const workDays = days !== null ? Number(days) || 0 : countWorkDays(start, end);
  const periodAbs = absences.filter((a) => a.employeeId === employeeId && !a.payrollId && start && end && a.date >= start && a.date <= end)
    .sort((a, b) => a.date.localeCompare(b.date));
  const absentDays = periodAbs.reduce((s, a) => s + a.days, 0);
  const gross = round2(rate * workDays);
  const absenceDed = round2(rate * absentDays);
  const owing = advances.filter((a) => a.employeeId === employeeId && balanceOf(a) > 0).sort(byOldest);
  const owed = round2(owing.reduce((s, a) => s + balanceOf(a), 0));
  const maxDeduct = Math.min(owed, Math.max(gross - absenceDed, 0));
  const advanceDed = deduct !== null ? Math.min(Math.max(Number(deduct) || 0, 0), maxDeduct) : maxDeduct;
  const net = round2(gross - absenceDed - advanceDed);

  const save = async (e) => {
    e.preventDefault(); setError("");
    if (!emp) return setError("Choose an employee.");
    if (!start || !end || end < start) return setError("Choose a valid pay period (start date, then end date).");
    if (!(workDays > 0)) return setError("Working days must be more than 0.");
    setSaving(true);
    try { await createPayroll({ employee: emp, start, end, workDays, absences: periodAbs, advances: owing, advanceDeduction: advanceDed }); onSaved(); }
    catch (err) { setError(err.message); setSaving(false); }
  };

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Generate payroll">
      <form className="card form wide" onSubmit={save} noValidate>
        <h2>Generate payroll</h2>
        {employees.length === 0 && <StatusMessage type="error">Add an employee first (Employees tab).</StatusMessage>}
        <label className="field"><span>Employee</span>
          <select value={employeeId} onChange={(e) => { setEmployeeId(e.target.value); setDeduct(null); }}>
            <option value="">Select…</option>
            {employees.map((x) => <option key={x.id} value={x.id}>{x.name} · {peso(x.dailyRate)}/day</option>)}
          </select></label>
        <div className="two">
          <label className="field"><span>Period start</span><input type="date" value={start} onChange={(e) => { setStart(e.target.value); setDays(null); setDeduct(null); }} /></label>
          <label className="field"><span>Period end</span><input type="date" value={end} onChange={(e) => { setEnd(e.target.value); setDays(null); setDeduct(null); }} /></label>
        </div>
        <label className="field"><span>Working days in the period (Mon–Sat counted automatically)</span>
          <input type="number" min="0" step="any" value={days !== null ? days : (workDays || "")} onChange={(e) => setDays(e.target.value)} /></label>

        {emp && (
          <div className="payslip">
            <div><span>Basic pay <small>{num(workDays)} days × {peso(rate)}</small></span><b>{peso(gross)}</b></div>
            <div className="minus"><span>Absences <small>{periodAbs.length ? periodAbs.map((a) => `${fmtDate(a.date)}${a.days < 1 ? " (half)" : ""}`).join(", ") : "none in this period"}</small></span><b>− {peso(absenceDed)}</b></div>
            <div className="minus"><span>Cash advance <small>{owed > 0 ? `${peso(owed)} owed` : "nothing owed"}</small></span><b>− {peso(advanceDed)}</b></div>
            {owed > 0 && (
              <label className="field inline"><span>Deduct this much now (₱)</span>
                <input type="number" min="0" step="any" value={deduct !== null ? deduct : advanceDed} onChange={(e) => setDeduct(e.target.value)} /></label>
            )}
            <div className="net"><span>Net pay</span><strong>{peso(net)}</strong></div>
          </div>
        )}
        <StatusMessage type="error">{error}</StatusMessage>
        <div className="row">
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={saving || !emp}>{saving ? "Saving…" : "Save payroll"}</button>
        </div>
      </form>
    </div>
  );
}
