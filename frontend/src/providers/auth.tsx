import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, clearCredentials, onUnauthorized } from "@/api/client";
const AuthContext = createContext<{
  username: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
} | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(null);
  const client = useQueryClient();
  function logout() {
    clearCredentials();
    setUsername(null);
    void client.cancelQueries();
    client.clear();
  }
  useEffect(() => onUnauthorized(logout), [client]);
  async function login(name: string, password: string) {
    await api.login(name, password);
    setUsername(name);
  }
  return (
    <AuthContext.Provider value={{ username, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("Missing AuthProvider");
  return value;
}
