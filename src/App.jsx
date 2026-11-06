import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { RotaCliente, RotaStaff } from './components/Rotas';
import Login from './pages/Login';
import Cadastro from './pages/Cadastro';
import Portal from './pages/Portal';

// O CSS das telas da equipe continua carregando junto com o resto, NA MESMA
// ORDEM de antes: as telas compartilham classes (topo, botões) e o Painel.css
// sobrescreve partes do Portal.css. Separar o CSS mudaria o visual.
import './pages/Painel.css';
import './pages/Configuracoes.css';

// Telas da equipe: só são baixadas quando alguém entra nelas.
// O cliente não precisa carregar esse código.
const LoginStaff = lazy(() => import('./pages/LoginStaff'));
const Painel = lazy(() => import('./pages/Painel'));
const Configuracoes = lazy(() => import('./pages/Configuracoes'));

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<div className="carregando-tela">Carregando…</div>}>
        <Routes>
          {/* Área do cliente */}
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/" element={<RotaCliente><Portal /></RotaCliente>} />

          {/* Painel da equipe */}
          <Route path="/staff" element={<LoginStaff />} />
          <Route path="/painel" element={<RotaStaff><Painel /></RotaStaff>} />
          <Route path="/configuracoes" element={<RotaStaff><Configuracoes /></RotaStaff>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
