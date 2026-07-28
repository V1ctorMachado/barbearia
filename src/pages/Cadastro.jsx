import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { traduzErroAuth } from '../lib/erros';

export default function Cadastro() {
  const { cadastrar } = useAuth();
  const navigate = useNavigate();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setErro('');

    if (!nome.trim()) { setErro('Informe seu nome.'); return; }
    if (senha.length < 6) { setErro('A senha deve ter ao menos 6 caracteres.'); return; }
    if (senha !== confirmar) { setErro('As senhas não conferem.'); return; }

    setCarregando(true);
    try {
      const cred = await cadastrar(email, senha);
      // Guarda o perfil do cliente (nome e telefone aparecem no painel da equipe).
      await setDoc(doc(db, 'clientes', cred.user.uid), {
        nome: nome.trim(),
        email,
        telefone,
        criadoEm: new Date(),
      });
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
        <h1 className="marca">Criar conta</h1>
        <p className="sub">Agende seu horário online</p>

        {erro && <div className="alerta">{erro}</div>}

        <div className="campo">
          <label>Nome</label>
          <input type="text" value={nome} onChange={(e) => setNome(e.target.value)}
                 autoComplete="name" placeholder="seu nome" />
        </div>
        <div className="campo">
          <label>E-mail</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                 autoComplete="email" placeholder="seu@email.com" />
        </div>
        <div className="campo">
          <label>Telefone</label>
          <input type="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)}
                 placeholder="(00) 00000-0000" />
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
