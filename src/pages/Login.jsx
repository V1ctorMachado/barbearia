import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { traduzErroAuth } from '../lib/erros';
import { celularValido, emailDoCelular, mascaraCelular } from '../lib/celular';
import { linkWhatsApp } from '../lib/config';
import { WHATSAPP_SUPORTE } from '../lib/dados';

export default function Login() {
  const { entrar } = useAuth();
  const navigate = useNavigate();
  const [celular, setCelular] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  // Esqueceu a senha: o suporte confere pelo número da conversa,
  // exclui a conta e o cliente se cadastra de novo (ver FIREBASE.md).
  const linkEsqueci = linkWhatsApp(WHATSAPP_SUPORTE,
    `Olá! Esqueci a senha do site de agendamento.${celularValido(celular) ? ` Meu cadastro é com o número ${celular}.` : ''}`);

  // Contas antigas foram criadas com e-mail: se tiver "@", entra por e-mail.
  const porEmail = celular.includes('@');

  async function enviar(e) {
    e.preventDefault();
    setErro('');
    if (!porEmail && !celularValido(celular)) { setErro('Informe o celular com DDD. Ex.: (27) 99999-8888'); return; }
    if (!senha) { setErro('Informe sua senha.'); return; }
    setCarregando(true);
    try {
      await entrar(porEmail ? celular.trim() : emailDoCelular(celular), senha);
      navigate('/');
    } catch (err) {
      setErro(traduzErroAuth(err.code, porEmail ? 'email' : 'celular'));
      setCarregando(false);
    }
  }

  return (
    <div className="tela-centro">
      <form className="cartao" onSubmit={enviar}>
        <img src="/logo.png" alt="Barbearia Mageschi" className="logo-cartao" />
        <p className="sub">Área do cliente</p>

        {erro && <div className="alerta">{erro}</div>}

        <div className="campo">
          <label>Celular</label>
          <input type="text" inputMode={porEmail ? 'email' : 'tel'} value={celular}
                 onChange={(e) => setCelular(e.target.value.includes('@') ? e.target.value : mascaraCelular(e.target.value))}
                 autoComplete="tel" placeholder="(27) 99999-8888" />
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
        <p className="rodape dica">
          Esqueceu a senha?{' '}
          {linkEsqueci
            ? <a href={linkEsqueci} target="_blank" rel="noopener noreferrer">Fale com o suporte pelo WhatsApp</a>
            : 'Fale com o suporte pelo WhatsApp.'}
        </p>
      </form>
    </div>
  );
}
