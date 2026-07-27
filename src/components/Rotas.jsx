import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Exige estar logado. Serve para a área do cliente.
export function RotaCliente({ children }) {
  const { usuario, carregando } = useAuth();
  if (carregando) return <div className="carregando-tela">Carregando…</div>;
  if (!usuario) return <Navigate to="/login" replace />;
  return children;
}

// Exige estar logado E ser da equipe. Serve para o painel.
export function RotaStaff({ children }) {
  const { usuario, ehStaff, carregando } = useAuth();
  if (carregando) return <div className="carregando-tela">Carregando…</div>;
  if (!usuario) return <Navigate to="/staff" replace />;
  if (!ehStaff) return <Navigate to="/" replace />; // cliente comum não entra no painel
  return children;
}
