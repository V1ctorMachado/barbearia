import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { comTimeout } from '../lib/tempo';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [ehStaff, setEhStaff] = useState(false);
  const [carregando, setCarregando] = useState(true);
  // true = não deu para falar com o servidor (mostra a tela "Sem conexão"
  // em vez de ficar em "Carregando…" para sempre).
  const [semConexao, setSemConexao] = useState(false);

  useEffect(() => {
    // Rede de segurança: se o login não responder em 12 s, para de carregar.
    const seguranca = setTimeout(() => {
      setSemConexao(true);
      setCarregando(false);
    }, 12000);

    // Observa login/logout. Dispara sempre que o estado de auth muda.
    const desinscrever = onAuthStateChanged(auth, async (u) => {
      clearTimeout(seguranca);
      setUsuario(u);
      if (u) {
        // Verifica se o usuário é da equipe: existe um doc em roles/{uid} com staff=true?
        try {
          const snap = await comTimeout(getDoc(doc(db, 'roles', u.uid)));
          setEhStaff(snap.exists() && snap.data().staff === true);
          setSemConexao(false);
        } catch (e) {
          setEhStaff(false);
          if (e?.code === 'TEMPO_ESGOTADO') setSemConexao(true);
        }
      } else {
        setEhStaff(false);
        setSemConexao(false);
      }
      setCarregando(false);
    });
    return () => { clearTimeout(seguranca); desinscrever(); };
  }, []);

  const entrar = (email, senha) => comTimeout(signInWithEmailAndPassword(auth, email, senha), 15000);
  const cadastrar = (email, senha) => comTimeout(createUserWithEmailAndPassword(auth, email, senha), 15000);
  const sair = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ usuario, ehStaff, carregando, semConexao, entrar, cadastrar, sair }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
