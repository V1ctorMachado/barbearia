import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { updatePassword } from 'firebase/auth';
import { db } from '../lib/firebase';
import { comTimeout, TEMPO_GRAVACAO } from '../lib/tempo';
import { useAuth } from '../context/AuthContext';
import { traduzErroAuth } from '../lib/erros';
import { celularValido, emailDoCelular, normalizarCelular, formatarCelular, mascaraCelular, senhaDoCelular, mesmoNome } from '../lib/celular';
import { primeiroNomeDe, WHATSAPP_SUPORTE } from '../lib/dados';
import { linkWhatsApp } from '../lib/config';

// Entrada do cliente só com NOME + CELULAR (sem senha).
//  • Número novo → cria a conta na hora.
//  • Número já cadastrado → entra (o primeiro nome precisa conferir).
//  • Conta antiga, criada com senha → pede a senha UMA vez e passa a
//    entrar sem senha dali em diante.
export default function Login() {
  const { entrar, cadastrar, sair } = useAuth();
  const navigate = useNavigate();
  const [nome, setNome] = useState('');
  const [celular, setCelular] = useState('');
  const [senhaAntiga, setSenhaAntiga] = useState('');
  const [pedirSenha, setPedirSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const gravarPerfil = (uid) => comTimeout(setDoc(doc(db, 'clientes', uid), {
    nome: nome.trim(),
    telefone: formatarCelular(celular),
    celular: normalizarCelular(celular),
    criadoEm: new Date(),
  }), TEMPO_GRAVACAO);

  // Já entrou: confere o primeiro nome com o cadastro.
  async function conferirNome(uid) {
    const snap = await comTimeout(getDoc(doc(db, 'clientes', uid)));
    if (!snap.exists()) { await gravarPerfil(uid); return true; }
    if (mesmoNome(nome, snap.data().nome, primeiroNomeDe)) return true;
    await sair();
    setErro('O nome não confere com o cadastro deste celular. Use o mesmo nome do seu cadastro.');
    return false;
  }

  async function enviar(e) {
    e.preventDefault();
    setErro('');
    if (!nome.trim()) { setErro('Informe seu nome.'); return; }
    if (!celularValido(celular)) { setErro('Informe o celular com DDD. Ex.: (27) 99999-8888'); return; }
    setCarregando(true);
    const email = emailDoCelular(celular);
    const senha = senhaDoCelular(celular);
    try {
      if (pedirSenha) {
        // Conta antiga: entra com a senha que o cliente criou e troca pela automática.
        if (!senhaAntiga) { setErro('Informe sua senha.'); setCarregando(false); return; }
        const cred = await entrar(email, senhaAntiga);
        await comTimeout(updatePassword(cred.user, senha), TEMPO_GRAVACAO);
        navigate('/');
        return;
      }
      try {
        const cred = await entrar(email, senha);           // já cadastrado (sem senha)
        if (await conferirNome(cred.user.uid)) navigate('/');
        else setCarregando(false);
      } catch (err1) {
        if (err1.code === 'TEMPO_ESGOTADO' || err1.code === 'auth/network-request-failed' || err1.code === 'auth/too-many-requests') throw err1;
        try {
          const cred = await cadastrar(email, senha);      // número novo → cria a conta
          await gravarPerfil(cred.user.uid);
          navigate('/');
        } catch (err2) {
          if (err2.code === 'auth/email-already-in-use') {  // conta antiga com senha
            setPedirSenha(true);
            setCarregando(false);
            return;
          }
          throw err2;
        }
      }
    } catch (err) {
      setErro(traduzErroAuth(err.code, 'celular'));
      setCarregando(false);
    }
  }

  return (
    <div className="tela-centro">
      <form className="cartao" onSubmit={enviar}>
        <img src="/logo.png" alt="Barbearia Mageschi" className="logo-cartao" />
        <p className="sub">Agende seu horário online</p>

        {erro && <div className="alerta">{erro}</div>}

        <div className="campo">
          <label>Nome</label>
          <input type="text" value={nome} onChange={(e) => setNome(e.target.value)}
                 autoComplete="name" placeholder="seu nome" disabled={pedirSenha} />
        </div>
        <div className="campo">
          <label>Celular (WhatsApp)</label>
          <input type="tel" inputMode="tel" value={celular}
                 onChange={(e) => setCelular(mascaraCelular(e.target.value))}
                 autoComplete="tel" placeholder="(27) 99999-8888" disabled={pedirSenha} />
        </div>

        {pedirSenha && (
          <>
            <div className="aviso-ok">
              Seu cadastro foi feito com senha. Digite-a <strong>só desta vez</strong>:
              nas próximas, você entra só com nome e celular.
            </div>
            <div className="campo">
              <label>Senha</label>
              <input type="password" value={senhaAntiga} onChange={(e) => setSenhaAntiga(e.target.value)}
                     autoComplete="current-password" placeholder="sua senha" autoFocus />
            </div>
            <p className="rodape dica">
              Esqueceu a senha?{' '}
              <a href={linkWhatsApp(WHATSAPP_SUPORTE, `Olá! Esqueci a senha do site de agendamento. Meu cadastro é com o número ${celular}.`) || '#'}
                 target="_blank" rel="noopener noreferrer">Fale com o suporte pelo WhatsApp</a>
            </p>
          </>
        )}

        <button className="btn btn-bloco" type="submit" disabled={carregando}>
          {carregando ? 'Entrando…' : 'Entrar'}
        </button>

        <p className="rodape dica">Primeira vez? É só preencher: a conta é criada na hora.</p>
      </form>
    </div>
  );
}
