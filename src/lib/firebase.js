// ─────────────────────────────────────────────────────────────
//  CONFIGURAÇÃO DO FIREBASE
//
//  Estes valores vêm do seu projeto no Firebase Console:
//  Configurações do projeto → Seus apps → App da Web → SDK.
//
//  Em desenvolvimento local, você pode colar os valores direto aqui
//  no objeto de fallback. Em produção (Vercel), o correto é definir
//  as variáveis de ambiente VITE_FIREBASE_* nas configurações do
//  projeto na Vercel — assim as chaves não ficam no código.
//
//  Obs.: estas chaves do Firebase NÃO são segredo (elas aparecem no
//  navegador de qualquer forma). O que protege seus dados são as
//  Regras de Segurança do Firestore — veja o arquivo firestore.rules.
// ─────────────────────────────────────────────────────────────

import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            || 'COLE_SEU_API_KEY',
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        || 'COLE_SEU_AUTH_DOMAIN',
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         || 'COLE_SEU_PROJECT_ID',
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     || 'COLE_SEU_STORAGE_BUCKET',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID|| 'COLE_SEU_SENDER_ID',
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             || 'COLE_SEU_APP_ID',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// Modo de teste local: com VITE_USE_EMULATOR=true no .env.local, o site usa
// o emulador do Firebase (firebase emulators:start) em vez do projeto real.
// Nunca ligar isso em produção.
if (import.meta.env.VITE_USE_EMULATOR === 'true') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}
export default app;
