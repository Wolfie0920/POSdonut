export default function DataTable({ columns, rows, onEdit, onDelete, canEdit, canRemove }) {
  if (!rows.length) return <p className="empty">Nothing here yet. Use “Add new” to create the first record.</p>;
  return (
    <div className="table-wrap">
      <table>
        <thead><tr>{columns.map((c) => <th key={c.key}>{c.label}</th>)}<th>Actions</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              {columns.map((c) => <td key={c.key} data-label={c.label}>{c.render ? c.render(r) : r[c.key]}</td>)}
              <td className="actions">
                {onEdit && (!canEdit || canEdit(r)) && <button className="btn small" onClick={() => onEdit(r)}>Edit</button>}
                {onDelete && (!canRemove || canRemove(r)) && <button className="btn small danger" onClick={() => onDelete(r)}>Delete</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
