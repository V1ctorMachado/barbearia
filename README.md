# Navalha & Cia — Agendamentos (React + Firebase)

Site de agendamento de barbearia, sem backend próprio: o **Firebase** cuida
do login e do banco de dados, e o site é publicado na **Vercel**.

- **Frontend:** React + Vite
- **Login:** Firebase Authentication (e-mail e senha)
- **Banco:** Cloud Firestore
- **Hospedagem:** Vercel

Duas áreas:
- **Cliente** (`/`) — cria conta, agenda um horário (entra como *pendente*),
  vê o histórico em "Meus agendamentos" e pode cancelar.
- **Equipe** (`/painel`) — vê a agenda do dia e **aprova ou recusa** os pedidos.

---

## Rodar no seu computador

Pré-requisito: [Node.js 18+](https://nodejs.org).

```bash
npm install
npm run dev
```

Abre em `http://localhost:5173`. Mas **antes** de funcionar de verdade, você
precisa configurar o Firebase (abaixo) — senão o login e o banco não respondem.

---

## Passo 1 — Criar o projeto no Firebase

1. Acesse <https://console.firebase.google.com> e clique em **Adicionar projeto**.
2. Dê um nome (ex.: `barbearia`) e conclua a criação.
3. No menu lateral, vá em **Criação → Authentication → Começar**, escolha
   **E-mail/senha** e ative.
4. Vá em **Criação → Firestore Database → Criar banco de dados**. Escolha o
   modo de produção e uma região (ex.: `southamerica-east1`).
5. Vá em **Configurações do projeto** (engrenagem no topo) → role até **Seus apps**
   → clique no ícone **Web** (`</>`) → registre o app. O Firebase mostra um
   objeto `firebaseConfig` com várias chaves. **Guarde esses valores.**

## Passo 2 — Conectar o site ao Firebase

Crie um arquivo `.env.local` na raiz do projeto (copie de `.env.example`) e
preencha com os valores do passo anterior:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

> Essas chaves do Firebase **não são segredo** — elas aparecem no navegador de
> qualquer forma. Quem protege os dados são as Regras de Segurança (passo 3).

## Passo 3 — Publicar as Regras de Segurança (IMPORTANTE)

Sem isto, seu banco fica aberto: qualquer pessoa poderia ler os agendamentos de
todos. As regras rodam nos servidores do Google e **não podem ser burladas**.

1. No Console, vá em **Firestore Database → aba Regras**.
2. Apague o que estiver lá e cole todo o conteúdo do arquivo **`firestore.rules`**
   (incluído neste projeto).
3. Clique em **Publicar**.

O que as regras garantem: o cliente só vê e mexe nos próprios agendamentos; só
a equipe vê todos e muda status; um cliente não lê o perfil de outro.

## Passo 4 — Definir quem é da equipe

O Firebase não tem "cargos" prontos. Marcamos a equipe com uma coleção `roles`:

1. Crie a conta da equipe normalmente (pode ser pelo próprio site, em `/cadastro`,
   ou em **Authentication → Usuários → Adicionar usuário**).
2. Copie o **UID** dessa conta (aparece em Authentication → Usuários).
3. Em **Firestore Database → Iniciar coleção**, crie:
   - Coleção: `roles`
   - ID do documento: **cole o UID** da conta da equipe
   - Campo: `staff` (tipo *boolean*) = `true`
4. Pronto. Essa conta agora acessa o painel em `/painel`.

> Para adicionar mais gente à equipe, repita: um documento em `roles` com o UID
> da pessoa e `staff: true`.

---

## Publicar na Vercel

1. Suba este projeto para um repositório no GitHub.
2. Na [Vercel](https://vercel.com), clique em **Add New → Project** e importe o
   repositório. Ela detecta o Vite automaticamente.
3. Em **Settings → Environment Variables**, cadastre as mesmas seis variáveis
   `VITE_FIREBASE_*` do passo 2.
4. **Deploy.** A cada `git push`, a Vercel republica sozinha.
5. No Firebase, vá em **Authentication → Settings → Domínios autorizados** e
   adicione o domínio da Vercel (e o seu domínio próprio, quando ligar) — senão
   o login é bloqueado nesses endereços.

O arquivo `vercel.json` já está incluído: ele garante que recarregar uma rota
como `/painel` funcione (sem ele, a Vercel daria 404 nas rotas internas).

---

## Endereços do site

| Quem | Rota | O que é |
|------|------|---------|
| Cliente novo | `/cadastro` | Criar conta |
| Cliente | `/login` | Entrar |
| Cliente | `/` | Agendar e ver histórico |
| Equipe | `/staff` | Login da equipe |
| Equipe | `/painel` | Agenda do dia, aprovar/recusar |

## Editar serviços, barbeiros ou horário

Estão em `src/lib/dados.js` — é só editar a lista e republicar. O horário de
funcionamento (padrão 9h–18h) também está lá, em `FUNCIONAMENTO`.
