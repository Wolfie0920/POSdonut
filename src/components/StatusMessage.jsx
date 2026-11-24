// Loading / error / success banner.
export default function StatusMessage({ type, children }) {
  if (!children) return null;
  return <p className={`status ${type}`} role={type === "error" ? "alert" : "status"}>{children}</p>;
}
