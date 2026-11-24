import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const links = [
  ["/", "Dashboard"], ["/products", "Products (POS)"], ["/orders", "Orders"], ["/remit", "Remit cash"], ["/sales", "Sales"], ["/expenses", "Expenses"],
  ["/inventory", "Inventory"], ["/production", "Production"], ["/recipes", "Recipes", true],
  ["/tax", "Tax & ROI", true], ["/payroll", "Payroll", true],
];

export default function Sidebar() {
  const { isOwner, logout } = useAuth();
  return (
    <nav className="sidebar" aria-label="Main">
      <strong className="brand">POS</strong>
      <ul>
        {links.filter(([, , ownerOnly]) => !ownerOnly || isOwner).map(([to, label]) => (
          <li key={to}><NavLink to={to} end={to === "/"}>{label}</NavLink></li>
        ))}
      </ul>
      <div className="who">
        <small>{isOwner ? "Super admin (owner)" : "Admin (employee)"}</small>
        <button className="btn ghost" onClick={logout}>Log out</button>
      </div>
    </nav>
  );
}
