import { Navigate, useLocation } from "react-router-dom";
import { getMesaSession } from "@/lib/mesaSession";

export function MesaProtectedRoute({ children }: { children: React.ReactNode }) {
  const session = getMesaSession();
  const location = useLocation();

  // Se não tem mesa logada, vai para selecionar-mesa
  if (!session) {
    return <Navigate to="/selecionar-mesa" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
