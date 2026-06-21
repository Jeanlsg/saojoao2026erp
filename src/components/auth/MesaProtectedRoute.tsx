import { Navigate, useLocation } from "react-router-dom";
import { getMesaSession } from "@/lib/mesaSession";

export function MesaProtectedRoute({ children }: { children: React.ReactNode }) {
  const session = getMesaSession();
  const location = useLocation();

  // Se tem mesa, permite acesso
  if (session) {
    return <>{children}</>;
  }

  // Se não tem mesa, vai para selecionar-mesa
  return <Navigate to="/selecionar-mesa" state={{ from: location }} replace />;
}
