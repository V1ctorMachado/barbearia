import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';

// Atalho na tela inicial do celular: nas telas da equipe o site usa um
// manifesto que abre em /staff; nas do cliente, o que abre em /.
const TITULO_CLIENTE = 'Barbearia Mageschi — Agendamentos';
const ROTAS_EQUIPE = /^\/(staff|painel|faturamento|configuracoes)/;
function ManifestoPorArea() {
  const { pathname } = useLocation();
  useEffect(() => {
    const equipe = ROTAS_EQUIPE.test(pathname);
    const link = document.getElementById('manifest');
    if (link) link.setAttribute('href', equipe ? '/staff.webmanifest' : '/site.webmanifest');
    document.title = equipe ? 'Mageschi Equipe' : TITULO_CLIENTE;
  }, [pathname]);
  return null;
}
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
import './pages/Faturamento.css';

// Telas da equipe: só são baixadas quando alguém entra nelas.
// O cliente não precisa carregar esse código.
// Se o arquivo não baixar (ex.: o site foi republicado e o navegador ainda
// tinha a versão antiga aberta), recarrega a página uma vez.
function lazyComRecarga(importar) {
  return lazy(() => importar().then((m) => {
    try { sessionStorage.removeItem('recarregou'); } catch { /* sem storage */ }
    return m;
  }).catch((erro) => {
    let jaTentou = false;
    try { jaTentou = sessionStorage.getItem('recarregou') === '1'; sessionStorage.setItem('recarregou', '1'); } catch { /* sem storage */ }
    if (!jaTentou) { window.location.reload(); return new Promise(() => {}); }
    throw erro;
  }));
}
const LoginStaff = lazyComRecarga(() => import('./pages/LoginStaff'));
const Painel = lazyComRecarga(() => import('./pages/Painel'));
const Configuracoes = lazyComRecarga(() => import('./pages/Configuracoes'));
const Faturamento = lazyComRecarga(() => import('./pages/Faturamento'));

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ManifestoPorArea />
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
          <Route path="/faturamento" element={<RotaStaff><Faturamento /></RotaStaff>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
