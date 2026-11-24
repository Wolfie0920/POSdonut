import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);
// The login form asks for a "username"; Firebase Auth needs an email, so we append a fixed domain.
const toEmail = (u) => (u.includes("@") ? u : `${u.trim().toLowerCase()}@pos.app`);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null); // "owner" | "admin"
  const [loading, setLoading] = useState(true);

  useEffect(() => onAuthStateChanged(auth, async (u) => {
    setUser(u);
    if (u) {
      try {
        const snap = await getDoc(doc(db, "users", u.uid));
        setRole(snap.exists() ? snap.data().role : "admin");
      } catch {
        setRole("admin"); // if the role cannot be read, fall back to the least-privileged role
      }
    } else setRole(null);
    setLoading(false);
  }), []);

  const login = (username, password) => signInWithEmailAndPassword(auth, toEmail(username), password);
  const logout = () => signOut(auth);
  return (
    <AuthContext.Provider value={{ user, role, isOwner: role === "owner", loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
