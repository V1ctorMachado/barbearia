import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [ehStaff, setEhStaff] = useState(false);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    // Observa login/logout. Dispara sempre que o estado de auth muda.
    const desinscrever = onAuthStateChanged(auth, async (u) => {
      setUsuario(u);
      if (u) {
        // Verifica se o usuário é da equipe: existe um doc em roles/{uid} com staff=true?
        try {
          const snap = await getDoc(doc(db, 'roles', u.uid));
          setEhStaff(snap.exists() && snap.data().staff === true);
        } catch {
          setEhStaff(false);
        }
      } else {
        setEhStaff(false);
      }
      setCarregando(false);
    });
    return desinscrever;
  }, []);

  const entrar = (email, senha) => signInWithEmailAndPassword(auth, email, senha);
  const cadastrar = (email, senha) => createUserWithEmailAndPassword(auth, email, senha);
  const sair = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ usuario, ehStaff, carregando, entrar, cadastrar, sair }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
