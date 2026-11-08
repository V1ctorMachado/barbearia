import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { comTimeout, TEMPO_GRAVACAO } from '../lib/tempo';
import { useAuth } from '../context/AuthContext';
import { traduzErroAuth } from '../lib/erros';
import { celularValido, emailDoCelular, normalizarCelular, formatarCelular, mascaraCelular } from '../lib/celular';

export default function Cadastro() {
  const { cadastrar } = useAuth();
  const navigate = useNavigate();
  const [nome, setNome] = useState('');
  const [celular, setCelular] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setErro('');

    if (!nome.trim()) { setErro('Informe seu nome.'); return; }
    if (!celularValido(celular)) { setErro('Informe o celular com DDD. Ex.: (27) 99999-8888'); return; }
    if (senha.length < 6) { setErro('A senha deve ter ao menos 6 caracteres.'); return; }
    if (senha !== confirmar) { setErro('As senhas não conferem.'); return; }

    setCarregando(true);
    try {
      // O celular é o "usuário" do login (ver src/lib/celular.js).
      const cred = await cadastrar(emailDoCelular(celular), senha);
      // Perfil do cliente (nome e telefone aparecem no painel da equipe).
      await comTimeout(setDoc(doc(db, 'clientes', cred.user.uid), {
        nome: nome.trim(),
        telefone: formatarCelular(celular),
        celular: normalizarCelular(celular),
        criadoEm: new Date(),
      }), TEMPO_GRAVACAO);
      navigate('/');
    } catch (err) {
      setErro(traduzErroAuth(err.code, 'celular'));
      setCarregando(false);
    }
  }

  return (
    <div className="tela-centro">
      <form className="cartao" onSubmit={enviar}>
        <img src="/logo.png" alt="Barbearia Mageschi" className="logo-cartao" />
        <h1 className="marca">Criar conta</h1>
        <p className="sub">Agende seu horário online</p>

        {erro && <div className="alerta">{erro}</div>}

        <div className="campo">
          <label>Nome</label>
          <input type="text" value={nome} onChange={(e) => setNome(e.target.value)}
                 autoComplete="name" placeholder="seu nome" />
        </div>
        <div className="campo">
          <label>Celular (WhatsApp)</label>
          <input type="tel" inputMode="tel" value={celular} onChange={(e) => setCelular(mascaraCelular(e.target.value))}
                 autoComplete="tel" placeholder="(27) 99999-8888" />
        </div>
        <div className="campo">
          <label>Senha</label>
          <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)}
                 autoComplete="new-password" placeholder="mínimo 6 caracteres" />
        </div>
        <div className="campo">
          <label>Confirmar senha</label>
          <input type="password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)}
                 autoComplete="new-password" placeholder="repita a senha" />
        </div>

        <button className="btn btn-bloco" type="submit" disabled={carregando}>
          {carregando ? 'Criando…' : 'Criar conta'}
        </button>

        <p className="rodape">Já tem conta? <Link to="/login">Entrar</Link></p>
      </form>
    </div>
  );
}
