import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import StatusMessage from "../components/StatusMessage";

export default function Login() {
  const { user, login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault(); setError(""); setInfo("");
    if (!username.trim() || !password) return setError("Enter your username and password.");
    setBusy(true);
    try { await login(username, password); } catch { setError("Wrong username or password."); }
    setBusy(false);
  };
  return (
    <div className="login">
      <form onSubmit={submit} noValidate>
        <input aria-label="Username" placeholder="username" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
        <input aria-label="Password" type="password" placeholder="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        <button className="btn" disabled={busy}>{busy ? "Signing in…" : "Login"}</button>
        <button type="button" className="link" onClick={() => setInfo("Ask the owner to reset your password in Firebase Authentication.")}>Forgot password</button>
        <StatusMessage type="error">{error}</StatusMessage>
        <StatusMessage type="success">{info}</StatusMessage>
      </form>
    </div>
  );
}
