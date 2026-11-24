// Controlled input / select with inline error message.
export default function FormField({ field, value, onChange, error }) {
  const id = `f-${field.name}`;
  return (
    <label htmlFor={id} className="field">
      <span>{field.label}</span>
      {field.type === "select" ? (
        <select id={id} value={value} onChange={(e) => onChange(field.name, e.target.value)}>
          <option value="">Select…</option>
          {field.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input id={id} type={field.type || "text"} value={value} min={field.type === "number" ? 0 : undefined}
          step={field.type === "number" ? "any" : undefined}
          onChange={(e) => onChange(field.name, e.target.value)} aria-invalid={!!error} />
      )}
      {error && <em className="err">{error}</em>}
    </label>
  );
}
