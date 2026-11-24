import { collection, deleteField, doc, increment, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export const balanceOf = (a) => (a.amount || 0) - (a.repaid || 0);
export const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
export const byOldest = (a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
export const fmtDate = (d) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) : "—");

// Working days between two YYYY-MM-DD dates, Monday to Saturday (Sundays off). The cashier can still change the number.
export function countWorkDays(start, end) {
  if (!start || !end || end < start) return 0;
  let n = 0;
  for (let d = new Date(`${start}T00:00:00`); d <= new Date(`${end}T00:00:00`); d.setDate(d.getDate() + 1)) if (d.getDay() !== 0) n++;
  return n;
}

// Saves a payroll in ONE all-or-nothing step: marks the absences as deducted, takes the cash-advance deduction from the
// oldest advances first, and writes the payroll record.
export async function createPayroll({ employee, start, end, workDays, absences, advances, advanceDeduction }) {
  const payRef = doc(collection(db, "payroll"));
  const rate = employee.dailyRate;
  const absentDays = absences.reduce((s, a) => s + a.days, 0);
  const gross = round2(rate * workDays);
  const absenceDeduction = round2(rate * absentDays);
  return runTransaction(db, async (tx) => {
    const absSnaps = await Promise.all(absences.map((a) => tx.get(doc(db, "absences", a.id))));
    const advSnaps = await Promise.all(advances.map((a) => tx.get(doc(db, "advances", a.id))));
    if (absSnaps.some((s) => !s.exists() || s.data().payrollId)) throw new Error("An absence was already used in another payroll. Close this form and open it again.");
    let left = Math.min(advanceDeduction, Math.max(gross - absenceDeduction, 0));
    const allocations = [];
    advSnaps.forEach((s) => {
      if (left <= 0 || !s.exists()) return;
      const take = Math.min(balanceOf(s.data()), left);
      if (take > 0) { allocations.push({ advanceId: s.id, amount: round2(take) }); left = round2(left - take); }
    });
    const taken = round2(allocations.reduce((s, a) => s + a.amount, 0));
    allocations.forEach((a) => tx.update(doc(db, "advances", a.advanceId), { repaid: increment(a.amount) }));
    absSnaps.forEach((s) => tx.update(s.ref, { payrollId: payRef.id }));
    tx.set(payRef, {
      employeeId: employee.id, employee: employee.name, periodStart: start, periodEnd: end, workDays, rate, gross,
      absentDays, absenceDeduction, advanceDeduction: taken, allocations, absenceIds: absences.map((a) => a.id),
      net: round2(gross - absenceDeduction - taken), createdAt: serverTimestamp(),
    });
  });
}

// Deleting a payroll gives the absences and cash advances it used back, so they are deducted again next time.
export async function deletePayroll(rec) {
  await runTransaction(db, async (tx) => {
    const advSnaps = await Promise.all((rec.allocations || []).map((a) => tx.get(doc(db, "advances", a.advanceId))));
    const absSnaps = await Promise.all((rec.absenceIds || []).map((id) => tx.get(doc(db, "absences", id))));
    advSnaps.forEach((s, i) => { if (s.exists()) tx.update(s.ref, { repaid: increment(-rec.allocations[i].amount) }); });
    absSnaps.forEach((s) => { if (s.exists()) tx.update(s.ref, { payrollId: deleteField() }); });
    tx.delete(doc(db, "payroll", rec.id));
  });
}
