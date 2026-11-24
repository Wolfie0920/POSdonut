import { useState } from "react";
import CrudPage from "../components/CrudPage";
import PayrollForm from "../components/PayrollForm";
import StatusMessage from "../components/StatusMessage";
import useCollection from "../hooks/useCollection";
import { balanceOf, deletePayroll, fmtDate } from "../payroll";
import { isToday, num, peso } from "../utils";

const TABS = ["Payroll", "Absences", "Cash advances", "Employees"];

// Payroll area (owner only): employees, absences, cash advances, and payroll that deducts both automatically.
export default function Payroll() {
  const [tab, setTab] = useState("Payroll");
  const employees = useCollection("employees");
  const absences = useCollection("absences");
  const advances = useCollection("advances");
  const payroll = useCollection("payroll");
  const empOptions = employees.items.map((e) => ({ value: e.id, label: e.name }));
  const nameOf = (id) => employees.items.find((e) => e.id === id);
  const needEmployees = () => (employees.items.length === 0 ? "Add an employee first (Employees tab)." : null);

  return (
    <section>
      <header className="page-head"><h1>Payroll</h1></header>
      <div className="seg period" role="tablist" aria-label="Payroll sections">
        {TABS.map((t) => <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>{t}</button>)}
      </div>

      {tab === "Payroll" && <PayrollTab payroll={payroll} employees={employees.items} absences={absences.items} advances={advances.items} />}

      {tab === "Absences" && <CrudPage title="Absences" collectionName="absences"
        fields={[
          { name: "employeeId", label: "Employee", type: "select", options: empOptions },
          { name: "date", label: "Date absent", type: "date" },
          { name: "type", label: "Type", type: "select", options: [{ value: "Absent", label: "Absent (full day)" }, { value: "Half day", label: "Half day" }] },
          { name: "note", label: "Note (optional)", required: false },
        ]}
        formHint={needEmployees}
        beforeSave={(d) => {
          if (absences.items.some((a) => a.employeeId === d.employeeId && a.date === d.date)) throw new Error("This absence is already recorded.");
          return { ...d, employeeName: nameOf(d.employeeId)?.name, days: d.type === "Half day" ? 0.5 : 1 };
        }}
        canEdit={() => false} canRemove={(r) => !r.payrollId}
        summary={() => <p className="note">Absences are deducted automatically (daily rate × days) the next time you generate payroll for that period.</p>}
        columns={[{ key: "date", label: "Date", render: (r) => fmtDate(r.date) }, { key: "employeeName", label: "Employee" }, { key: "type", label: "Type" },
          { key: "ded", label: "Deduction", render: (r) => peso((nameOf(r.employeeId)?.dailyRate || 0) * r.days) },
          { key: "status", label: "Status", render: (r) => r.payrollId ? <span className="pill ok">Deducted</span> : <span className="pill low">Pending</span> }]} />}

      {tab === "Cash advances" && <CrudPage title="Cash advances" collectionName="advances"
        fields={[
          { name: "employeeId", label: "Employee", type: "select", options: empOptions },
          { name: "amount", label: "Amount given (₱)", type: "number" },
          { name: "note", label: "Note (optional)", required: false },
        ]}
        formHint={needEmployees}
        beforeSave={(d) => ({ ...d, employeeName: nameOf(d.employeeId)?.name, repaid: 0 })}
        canEdit={(r) => !(r.repaid > 0)} canRemove={(r) => !(r.repaid > 0)}
        summary={(rows) => {
          const owing = employees.items.map((e) => ({ e, due: rows.filter((a) => a.employeeId === e.id).reduce((s, a) => s + balanceOf(a), 0) })).filter((x) => x.due > 0);
          return (<>
            <p className="note">The balance is deducted automatically (oldest first) when you generate that employee’s payroll.</p>
            {owing.length > 0 && <div className="chips">{owing.map(({ e, due }) => <span className="chip" key={e.id}>{e.name} owes <b>{peso(due)}</b></span>)}</div>}
          </>);
        }}
        columns={[{ key: "createdAt", label: "Date", render: (r) => r.createdAt?.toDate?.().toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) ?? "…" },
          { key: "employeeName", label: "Employee" }, { key: "amount", label: "Amount", render: (r) => peso(r.amount) },
          { key: "repaid", label: "Repaid", render: (r) => peso(r.repaid) },
          { key: "bal", label: "Balance", render: (r) => balanceOf(r) > 0 ? <span className="pill low">{peso(balanceOf(r))} left</span> : <span className="pill ok">Paid</span> },
          { key: "note", label: "Note" }]} />}

      {tab === "Employees" && <CrudPage title="Employees" collectionName="employees"
        fields={[{ name: "name", label: "Employee name" }, { name: "dailyRate", label: "Daily rate (₱)", type: "number" }]}
        columns={[{ key: "name", label: "Name" }, { key: "dailyRate", label: "Daily rate", render: (r) => peso(r.dailyRate) }]} />}
    </section>
  );
}

function PayrollTab({ payroll, employees, absences, advances }) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const rows = payroll.items;
  const owed = advances.reduce((s, a) => s + balanceOf(a), 0);

  const del = async (r) => {
    if (!window.confirm("Delete this payroll? The absences and cash advances it used will be counted again next time.")) return;
    try { await deletePayroll(r); setMsg({ type: "success", text: "Payroll deleted." }); } catch (e) { setMsg({ type: "error", text: e.message }); }
  };

  return (
    <div>
      <div className="page-head"><p className="note">{rows.filter(isToday).length} payrolls today · cash advances owed: <b>{peso(owed)}</b></p>
        <button className="btn" onClick={() => setOpen(true)}>Generate payroll</button></div>
      <StatusMessage type={msg.type}>{msg.text}</StatusMessage>
      <StatusMessage type="error">{payroll.error}</StatusMessage>
      {payroll.loading ? <p className="status">Loading…</p> : rows.length === 0 ? <p className="empty">No payroll yet. Add employees, then use Generate payroll.</p> : (
        <div className="table-wrap"><table>
          <thead><tr><th>Employee</th><th>Period</th><th>Basic pay</th><th>Absences</th><th>Cash advance</th><th>Net pay</th><th>Actions</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id}>
              <td data-label="Employee"><strong>{r.employee}</strong></td>
              <td data-label="Period">{r.periodStart ? `${fmtDate(r.periodStart)} – ${fmtDate(r.periodEnd)}` : "—"}</td>
              <td data-label="Basic pay">{peso(r.gross ?? (r.days || 0) * (r.rate || 0))}<small className="sub">{num(r.workDays ?? r.days)} days</small></td>
              <td data-label="Absences">{r.absenceDeduction ? <span className="minus-t">− {peso(r.absenceDeduction)}<small className="sub">{num(r.absentDays)} day(s)</small></span> : "—"}</td>
              <td data-label="Cash advance">{(r.advanceDeduction ?? r.deductions) ? <span className="minus-t">− {peso(r.advanceDeduction ?? r.deductions)}</span> : "—"}</td>
              <td data-label="Net pay"><b className="money">{peso(r.net)}</b></td>
              <td className="actions"><button className="btn small danger" onClick={() => del(r)}>Delete</button></td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
      {open && <PayrollForm employees={employees} absences={absences} advances={advances} onClose={() => setOpen(false)}
        onSaved={() => { setOpen(false); setMsg({ type: "success", text: "Payroll saved. Absences and cash advances were deducted." }); }} />}
    </div>
  );
}
