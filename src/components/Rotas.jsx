import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Tela mostrada quando o servidor não responde (em vez de "Carregando…" eterno).
export function TelaSemConexao() {
  return (
    <div className="carregando-tela sem-conexao">
      <p><strong>Não foi possível conectar ao servidor.</strong></p>
      <p>Verifique sua internet. Se estiver nos dados móveis, tente o Wi-Fi (ou o contrário).</p>
      <button className="btn" onClick={() => window.location.reload()}>Tentar novamente</button>
    </div>
  );
}

// Exige estar logado. Serve para a área do cliente.
export function RotaCliente({ children }) {
  const { usuario, carregando, semConexao } = useAuth();
  if (carregando) return <div className="carregando-tela">Carregando…</div>;
  if (semConexao) return <TelaSemConexao />;
  if (!usuario) return <Navigate to="/login" replace />;
  return children;
}

// Exige estar logado E ser da equipe. Serve para o painel.
export function RotaStaff({ children }) {
  const { usuario, ehStaff, carregando, semConexao } = useAuth();
  if (carregando) return <div className="carregando-tela">Carregando…</div>;
  // Sem resposta do servidor não dá para saber se é da equipe: não expulsa,
  // mostra a tela de conexão.
  if (semConexao) return <TelaSemConexao />;
  if (!usuario) return <Navigate to="/staff" replace />;
  if (!ehStaff) return <Navigate to="/" replace />; // cliente comum não entra no painel
  return children;
}
