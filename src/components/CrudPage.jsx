import { useState } from "react";
import useCollection from "../hooks/useCollection";
import FormField from "./FormField";
import DataTable from "./DataTable";
import StatusMessage from "./StatusMessage";

// Reusable CRUD screen: list + validated controlled form. Used by every module.
// Optional props: beforeSave(data) (may be async), afterCreate(data), afterDelete(record),
// handleCreate(data) to merge into an existing record, canEdit(record), rowFilter(items) to narrow the table, field.showIf(values) for conditional fields, summary(items).
export default function CrudPage({ title, collectionName, fields, columns, canDelete = true, canEdit, beforeSave, afterCreate, afterDelete, summary, formHint, rowFilter, canRemove, handleCreate }) {
  const { items, loading, error, add, update, remove } = useCollection(collectionName);
  const empty = Object.fromEntries(fields.map((f) => [f.name, ""]));
  const [values, setValues] = useState(empty);
  const [errors, setErrors] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const visible = fields.filter((f) => !f.showIf || f.showIf(values));
  const labelOf = (f) => (typeof f.label === "function" ? f.label(values) : f.label);
  const change = (k, v) => setValues((s) => ({ ...s, [k]: v }));
  const validate = () => {
    const e = {};
    visible.forEach((f) => {
      const v = String(values[f.name] ?? "").trim();
      if (f.required !== false && !v) e[f.name] = `${labelOf(f)} is required`;
      else if (f.type === "number" && v && Number(v) < 0) e[f.name] = `${labelOf(f)} cannot be negative`;
    });
    setErrors(e); return !Object.keys(e).length;
  };
  const close = () => { setOpen(false); setEditingId(null); setValues(empty); setErrors({}); };

  const submit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true); setMsg({ type: "", text: "" });
    try {
      let data = Object.fromEntries(visible.map((f) => [f.name, f.type === "number" ? Number(values[f.name] || 0) : String(values[f.name]).trim()]));
      if (beforeSave) data = await beforeSave(data);
      let done = editingId ? "Record updated." : "Record added.";
      if (editingId) await update(editingId, data);
      else {
        const merged = handleCreate ? await handleCreate(data) : null;   // returns a message when it merged into an existing record
        if (merged) done = merged; else { await add(data); if (afterCreate) await afterCreate(data); }
      }
      setMsg({ type: "success", text: done });
      close();
    } catch (e) { setMsg({ type: "error", text: e.message }); }
    setSaving(false);
  };
  const edit = (r) => { setValues(Object.fromEntries(fields.map((f) => [f.name, r[f.name] ?? ""]))); setEditingId(r.id); setOpen(true); };
  const del = async (r) => {
    if (!window.confirm("Delete this record?")) return;
    try { await remove(r.id); if (afterDelete) await afterDelete(r); setMsg({ type: "success", text: "Record deleted." }); }
    catch (e) { setMsg({ type: "error", text: e.message }); }
  };

  return (
    <section>
      <header className="page-head">
        <h1>{title}</h1>
        <button className="btn" onClick={() => setOpen(true)}>Add new</button>
      </header>
      {summary && summary(items)}
      <StatusMessage type={msg.type}>{msg.text}</StatusMessage>
      <StatusMessage type="error">{error}</StatusMessage>
      {loading ? <p className="status">Loading…</p>
        : <DataTable columns={columns} rows={rowFilter ? rowFilter(items) : items} onEdit={edit} canEdit={canEdit} canRemove={canRemove} onDelete={canDelete ? del : undefined} />}
      {open && (
        <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
          <form className="card form" onSubmit={submit} noValidate>
            <h2>{editingId ? "Edit" : "Add"} record</h2>
            {visible.map((f) => <FormField key={f.name} field={{ ...f, label: labelOf(f) }} value={values[f.name]} onChange={change} error={errors[f.name]} />)}
            {formHint && formHint(values, editingId) && <div className="hint">{formHint(values, editingId)}</div>}
            <div className="row">
              <button type="button" className="btn ghost" onClick={close}>Cancel</button>
              <button className="btn" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
