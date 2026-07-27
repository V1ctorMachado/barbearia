import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { RotaCliente, RotaStaff } from './components/Rotas';
import Login from './pages/Login';
import Cadastro from './pages/Cadastro';
import Portal from './pages/Portal';
import LoginStaff from './pages/LoginStaff';
import Painel from './pages/Painel';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Área do cliente */}
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/" element={<RotaCliente><Portal /></RotaCliente>} />

          {/* Painel da equipe */}
          <Route path="/staff" element={<LoginStaff />} />
          <Route path="/painel" element={<RotaStaff><Painel /></RotaStaff>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
