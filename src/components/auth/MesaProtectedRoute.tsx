import { Navigate, useLocation } from "react-router-dom";
import { getMesaSession } from "@/lib/mesaSession";
import { useAuth } from "@/contexts/AuthContext";

export function MesaProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin } = useAuth();
  const session = getMesaSession();
  const location = useLocation();

  // Admin e usuários logados (entregadores) não precisam de mesa
  if (isAdmin || user) {
    return <>{children}</>;
  }

  // Usuários não logados precisam selecionar uma mesa
  if (!session) {
    return <Navigate to="/selecionar-mesa" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
