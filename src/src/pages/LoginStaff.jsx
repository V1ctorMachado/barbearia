import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { traduzErroAuth } from '../lib/erros';

export default function LoginStaff() {
  const { entrar, usuario, ehStaff, carregando } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [tentouEntrar, setTentouEntrar] = useState(false);

  // Só decide para onde ir DEPOIS que a verificação de equipe terminou.
  // Isso evita a "corrida" em que o site redirecionava antes de saber
  // se o usuário é staff (o que jogava a equipe para o portal do cliente).
  useEffect(() => {
    if (!tentouEntrar || carregando) return; // espera a checagem terminar
    if (usuario && ehStaff) {
      navigate('/painel');          // é da equipe → painel
    } else if (usuario && !ehStaff) {
      setErro('Esta conta não tem acesso de equipe.');
      setEnviando(false);
    }
  }, [tentouEntrar, carregando, usuario, ehStaff, navigate]);

  async function enviar(e) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      await entrar(email, senha);
      setTentouEntrar(true); // dispara o useEffect acima quando a checagem terminar
    } catch (err) {
      setErro(traduzErroAuth(err.code));
      setEnviando(false);
    }
  }

  return (
    <div className="tela-centro">
      <form className="cartao" onSubmit={enviar}>
        <img src="/logo.png" alt="Barbearia Mageschi" className="logo-cartao" />
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

        <button className="btn btn-bloco" type="submit" disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
