import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { traduzErroAuth } from '../lib/erros';

export default function LoginStaff() {
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
      navigate('/painel');
    } catch (err) {
      setErro(traduzErroAuth(err.code));
      setCarregando(false);
    }
  }

  return (
    <div className="tela-centro">
      <form className="cartao" onSubmit={enviar}>
        <div className="poles-mini"><span className="pole-mini" /><span className="pole-mini" /></div>
        <h1 className="marca">Navalha &amp; Cia</h1>
        <p className="sub">Acesso da equipe</p>

        {erro && <div className="alerta">{erro}</div>}

        <div className="campo">
          <label>E-mail</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                 autoComplete="email" placeholder="equipe@email.com" />
        </div>
        <div className="campo">
          <label>Senha</label>
          <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)}
                 autoComplete="current-password" placeholder="sua senha" />
        </div>

        <button className="btn btn-bloco" type="submit" disabled={carregando}>
          {carregando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
