import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { traduzErroAuth } from '../lib/erros';

export default function Login() {
  const { entrar } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setErro('');
    setCarregando(true);
    try {
      await entrar(email, senha);
      navigate('/');
    } catch (err) {
      setErro(traduzErroAuth(err.code));
      setCarregando(false);
    }
  }

  return (
    <div className="tela-centro">
      <form className="cartao" onSubmit={enviar}>
        <div className="poles-mini"><span className="pole-mini" /><span className="pole-mini" /></div>
        <h1 className="marca">Barbearia Mageschi</h1>
        <p className="sub">Área do cliente</p>

        {erro && <div className="alerta">{erro}</div>}

        <div className="campo">
          <label>E-mail</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                 autoComplete="email" placeholder="seu@email.com" />
        </div>
        <div className="campo">
          <label>Senha</label>
          <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)}
                 autoComplete="current-password" placeholder="sua senha" />
        </div>

        <button className="btn btn-bloco" type="submit" disabled={carregando}>
          {carregando ? 'Entrando…' : 'Entrar'}
        </button>

        <p className="rodape">Não tem conta? <Link to="/cadastro">Criar conta</Link></p>
      </form>
    </div>
  );
}
