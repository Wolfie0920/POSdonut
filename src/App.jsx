import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Remit from "./pages/Remit";
import Orders from "./pages/Orders";
import Recipes from "./pages/Recipes";
import Sales from "./pages/Sales";
import Expenses from "./pages/Expenses";
import Inventory from "./pages/Inventory";
import Production from "./pages/Production";
import Tax from "./pages/Tax";
import Payroll from "./pages/Payroll";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="products" element={<Products />} />
        <Route path="orders" element={<Orders />} />
        <Route path="remit" element={<Remit />} />
        <Route path="sales" element={<Sales />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="recipes" element={<ProtectedRoute ownerOnly><Recipes /></ProtectedRoute>} />
        <Route path="production" element={<Production />} />
        <Route path="tax" element={<ProtectedRoute ownerOnly><Tax /></ProtectedRoute>} />
        <Route path="payroll" element={<ProtectedRoute ownerOnly><Payroll /></ProtectedRoute>} />
      </Route>
    </Routes>
  );
}
