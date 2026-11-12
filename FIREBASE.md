# Firebase — Barbearia Mageschi

Tudo o que envolve o Firebase neste projeto: estrutura do banco, regras de
segurança, como publicar e o que manter sincronizado.

Arquivos relacionados:
- `firestore.rules` — regras de segurança do Firestore (publicar no Firebase)
- `firebase.json` — permite publicar as regras pela linha de comando
- `.env.example` — modelo das chaves de conexão (copiar para `.env.local`)

---

## ⚠️ Pendências

- [x] ~~Preços e durações dos serviços~~ — definidos em 06/11/2026 (tabela abaixo).
- [ ] **Antes de abrir para clientes reais:** trocar `PERMITIR_EXCLUIR` para
      `false` em `src/lib/dados.js` (esconde o botão 🗑 de excluir do painel).
- [ ] Confirmar com o barbeiro a duração da **Pigmentação avulsa** (definida
      como 20 min: 50 do combo − 30 do corte).

---

## Serviços atuais

| ID | Nome | Preço | Duração |
|---|---|---|---|
| `corte` | Corte | R$ 35 | 30 min |
| `barba` | Barba | R$ 30 | 20 min |
| `corte-barba` | Corte + Barba | R$ 65 | 60 min |
| `pezinho` | Pezinho | R$ 10 | 10 min |
| `pigmentacao-avulsa` | Pigmentação | R$ 25 | 20 min |
| `pigmentacao` | Corte + Pigmentação | R$ 60 | 50 min |
| `luzes` | Luzes | R$ 100 | 90 min |
| `descoloracao` | Descoloração | R$ 130 | 90 min |

Fica em `src/lib/dados.js` **e** em `servicos()` no `firestore.rules` — os
dois precisam ser iguais. O **ID** não deve mudar para um serviço que já
existe (agendamentos antigos guardam o ID; o nome e o preço deles ficam
gravados no próprio agendamento, então mudar preço não altera o histórico).

---

## Estrutura do banco (Firestore)

| Coleção | ID do documento | Quem lê | Quem escreve | Conteúdo |
|---|---|---|---|---|
| `agendamentos` | automático | dono do pedido e equipe | cliente cria / cancela o seu; equipe altera | pedido completo: cliente, serviço, preço, data, status, `ocupacaoId` |
| `ocupacoes` | `barbeiro_AAAA-MM-DD_HHMM` | qualquer logado | junto com o pedido; equipe altera | só horário, duração, status e `agendamentoId` (sem dado pessoal) |
| `clientes` | UID do cliente | o próprio e equipe | o próprio | nome, e-mail, telefone |
| `config` | `geral` | todos | equipe | WhatsApp, aviso do topo, datas bloqueadas |
| `roles` | UID | o próprio | ninguém pelo site (só no Console) | `staff: true` marca quem é da equipe |

### Por que duas coleções para o agendamento
- **`ocupacoes`** tem ID fixo por horário. Como o Firestore não permite dois
  documentos com o mesmo ID, isso impede que duas pessoas reservem o mesmo
  horário. O campo `agendamentoId` diz qual pedido ocupa o horário no momento.
- **`agendamentos`** tem ID próprio e nunca é sobrescrito. Se um horário for
  cancelado e outra pessoa reservar, o histórico do primeiro cliente continua.
- Agendamentos antigos (anteriores a 06/11/2026) usam o mesmo ID nas duas
  coleções e não têm `ocupacaoId`/`agendamentoId`. O código e as regras
  tratam esse caso — não precisa migrar nada.

### Status de um agendamento
`pendente` → `agendado` → `confirmado` → `concluido`
A qualquer momento antes de concluir: `cancelado` (cliente ou equipe) ou
`recusado` (equipe, só quando pendente). Cancelado/recusado libera o horário.

---

## O que as regras garantem

- Cliente só lê e cancela os **próprios** agendamentos.
- O cliente pode marcar `avisoEnviado: true` **uma única vez**, só em pedido
  pendente e sem alterar nenhum outro campo (botão "Avisar a barbearia").
- Ao cancelar, o cliente só pode mudar o `status` (não altera data, preço etc.)
  e só se o pedido ainda estiver ativo (não dá para cancelar um concluído).
- Pedido novo precisa ter **serviço, preço e duração oficiais** (tabela
  `servicos()`), barbeiro válido e data no futuro — impede preço falso.
- Toda ocupação precisa de um pedido real do próprio cliente, gravado junto —
  impede travar a agenda com horários "fantasmas".
- Horário cancelado/recusado pode ser reservado de novo por outra pessoa, sem
  afetar o pedido antigo.
- Só a equipe (`roles/{uid}.staff == true`) aprova, recusa, conclui e mexe nas
  configurações.

---

## Como publicar as regras

**Opção 1 — pelo Console (mais simples)**
1. <https://console.firebase.google.com> → seu projeto → **Firestore Database → Regras**.
2. Apague tudo, cole o conteúdo de `firestore.rules` e clique em **Publicar**.

**Opção 2 — pela linha de comando**
```bash
npm install -g firebase-tools
firebase login
firebase use --add          # escolha o projeto (só na primeira vez)
firebase deploy --only firestore:rules
```

> **Publique as regras e o site (Vercel) juntos.** Código e regras dependem
> um do outro: com só um dos dois atualizado, novos agendamentos são negados.

---

## O que manter sincronizado

| Se mudar… | Atualize também |
|---|---|
| Preço ou duração de um serviço em `src/lib/dados.js` | `servicos()` no `firestore.rules` |
| Adicionar/remover serviço | `SERVICOS` em `dados.js` **e** `servicos()` nas regras |
| Adicionar barbeiro em `BARBEIROS` | `barbeiros()` no `firestore.rules` |

Esquecer isso faz os pedidos daquele serviço/barbeiro serem **negados**.

---

## Desempenho (para não ficar lento com muitos dados)

As consultas pedem ao Firestore **só o necessário**, em vez de baixar tudo e
filtrar no navegador:

| Tela | Consulta | Leituras (teste com 1 ano de dados) |
|---|---|---|
| "Ver horários" (cliente) | `ocupacoes` só do dia escolhido | ~4 (antes: 3.003) |
| Painel sem data | `agendamentos` de hoje em diante, 50 por vez + "Carregar mais" | 50 por página (antes: 3.126 de uma vez) |
| Painel com data | `agendamentos` só daquele dia | só os do dia |

- Todas usam filtro de intervalo em **um único campo** (`dataHora`), então
  **não precisam de índice composto** no Firebase.
- Dias passados continuam acessíveis escolhendo a data no painel.
- Telefones dos clientes são buscados uma vez só por sessão.
- As telas da equipe (Painel, Configurações, login da equipe) são baixadas só
  quando alguém entra nelas. React e Firebase ficam em arquivos separados,
  reaproveitados do cache entre publicações.

---

## Login dos clientes (celular + senha)

- O cliente entra com **celular + senha**, sem e-mail. Por baixo, o Firebase
  usa o provedor **E-mail/senha** com um endereço interno montado a partir do
  número: `27999998888@cliente.mageschi.app`. Esse endereço não existe e não
  recebe nada. **Não desative o provedor E-mail/senha** em Authentication.
- No Console (Authentication → Usuários), os clientes aparecem por esse
  endereço; os números estão nele.
- Contas antigas, com e-mail de verdade, continuam entrando pelo mesmo campo.
- A **equipe** continua entrando com e-mail em `/staff`.
- **Esqueceu a senha** (decidido em 08/11: sem SMS, para não usar o Blaze):
  1. O cliente toca em "Fale com o suporte pelo WhatsApp" no login. O link vai
     para o **WhatsApp do suporte, (27) 98858-2900** (`WHATSAPP_SUPORTE` em
     `src/lib/dados.js`), não para o da barbearia. A mensagem já vem escrita
     com o número do cadastro.
  2. O suporte confere se a conversa veio **do mesmo número** do cadastro.
  3. Firebase Console → Authentication → Usuários → procurar
     `<número>@cliente.mageschi.app` → ⋮ → **Excluir conta**.
  4. O cliente se cadastra de novo com o mesmo número e uma senha nova.
  Os agendamentos antigos continuam no painel da equipe, mas não aparecem no
  "Meus agendamentos" da conta nova. Se isso virar problema, a evolução é um
  botão "Gerar senha temporária" no painel (Cloudflare Worker, grátis).
- O número **não é verificado** (sem SMS). A verificação por SMS exige o plano
  Blaze e custa por mensagem.

---

## Agendamento feito pela equipe

- Botão **+ Agendar cliente** no painel. O agendamento é gravado com
  `clienteUid: ''` (cliente sem conta), `origem: 'equipe'`, `criadoPor`
  (UID de quem marcou) e já com `status: 'agendado'`.
- Regras: só a **equipe** (`ehStaff()`) pode criar agendamento e ocupação
  sem as validações do cliente. Um cliente que tente o mesmo atalho é negado.

---

## Migrar contas antigas (e-mail → celular) — rodar uma vez

> ✅ **Executada em 08/11/2026:** 19 contas migradas, 0 falhas. Relatório em
> `scripts/migrar-logins/relatorio-migracao.csv`. Pode ser rodada de novo
> para contas que tiverem o telefone corrigido. Para deixar contas de fora:
> `node migrar.mjs --aplicar --pular=email@x.com`.

Contas criadas antes do login por celular entram com e-mail e **não são
encontradas** pelo número. O script `scripts/migrar-logins` troca o "usuário"
delas para `<celular>@cliente.mageschi.app`, usando o telefone do cadastro.
**A senha continua a mesma** e a conta é a mesma (o histórico de agendamentos
fica). Contas da equipe não são mexidas. Funciona no plano gratuito.

**Passo a passo (no computador, uma vez só):**
1. Firebase Console → ⚙ **Configurações do projeto** → aba **Contas de serviço**
   → **Gerar nova chave privada**. Salve o arquivo baixado como
   `C:\dev\stevon\scripts\migrar-logins\chave-servico.json`.
   ⚠️ Essa chave dá acesso total ao Firebase: **não envie a ninguém, não
   suba para o GitHub** (o `.gitignore` e o `.vercelignore` já a bloqueiam).
2. Abra o terminal na pasta e instale:
   ```
   cd C:\dev\stevon\scripts\migrar-logins
   npm install
   ```
3. **Simule** (não altera nada) e confira a lista e o `relatorio-simulacao.csv`:
   ```
   npm run simular
   ```
4. Se estiver tudo certo, **aplique**:
   ```
   npm run aplicar
   ```
5. **Apague a chave** `chave-servico.json` depois (e, se quiser, revogue-a no
   Console, na mesma tela de Contas de serviço).

**O que o relatório pode mostrar:**
| Situação | O que fazer |
|---|---|
| SERÁ MIGRADA / MIGRADA | Nada. O cliente já entra com celular + senha antiga. |
| já usa celular | Conta nova; nada a fazer. |
| equipe | Continua entrando com e-mail em `/staff`. |
| SEM TELEFONE / TELEFONE INVÁLIDO | Corrigir o campo `telefone` em `clientes/{uid}` no Console e rodar de novo; ou o cliente cria conta nova. |
| CONFLITO: celular repetido | Duas contas antigas com o mesmo número: decidir qual fica (excluir a outra em Authentication) e rodar de novo. |
| CONFLITO: já existe conta nova | O cliente já criou conta pelo celular. Excluir a antiga **ou** a nova (a que tiver menos histórico) e rodar de novo. |

Pode rodar quantas vezes quiser: o que já foi migrado é ignorado.
Depois da migração, o **e-mail antigo deixa de funcionar** para esse cliente;
o registro dele fica em `clientes/{uid}.emailAntigo`.

---

## Conexão (redes móveis)

- O Firestore usa **long polling** (`experimentalForceLongPolling` em
  `src/lib/firebase.js`), porque em algumas redes a conexão contínua travava
  o site no celular.
- Toda operação tem **limite de tempo** (`src/lib/tempo.js`). Se o servidor
  não responder, o site mostra uma mensagem ou a tela "Sem conexão" com
  "Tentar novamente" — nunca fica em "Carregando…" para sempre.

---

## Testar localmente com o emulador

Permite rodar o site inteiro no computador, com login e banco **falsos**, sem
mexer nos dados reais.

1. Crie um `.env.local` com:
   ```
   VITE_USE_EMULATOR=true
   VITE_FIREBASE_API_KEY=fake-api-key
   VITE_FIREBASE_AUTH_DOMAIN=demo-barbearia.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=demo-barbearia
   VITE_FIREBASE_STORAGE_BUCKET=demo-barbearia.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=0
   VITE_FIREBASE_APP_ID=1:0:web:0
   ```
2. Em um terminal: `firebase emulators:start --project demo-barbearia`
   (precisa de Java instalado; já usa o `firestore.rules` do projeto).
3. Em outro: `npm run dev` e abra `http://localhost:5173`.
4. Para ter acesso de equipe no emulador, crie a conta pelo site e adicione
   `roles/{uid}` com `staff: true` pela interface do emulador
   (habilite `"ui": { "enabled": true }` no `firebase.json`).

> **Nunca** use `VITE_USE_EMULATOR=true` nas variáveis da Vercel.

---

## Adicionar alguém à equipe

1. A pessoa cria a conta (pelo site em `/cadastro` ou em **Authentication → Usuários**).
2. Copie o **UID** dela em **Authentication → Usuários**.
3. Em **Firestore → `roles`** crie um documento com ID = UID e o campo
   `staff` (boolean) = `true`.
4. Ela passa a acessar `/staff` → `/painel`.

---

## Histórico de mudanças

**06/11/2026**
- Criado `firestore.rules` revisado: validação de preço/duração/barbeiro/data,
  cancelamento só altera status, bloqueio de ocupações fantasmas.
- Corrigido: horário cancelado ficava travado para sempre.
- Pedido e horário passaram a ter IDs separados (`ocupacaoId` / `agendamentoId`)
  para preservar o histórico do cliente.
- Regras testadas no emulador do Firestore (14 cenários).
- Desempenho: "Ver horários" e painel passaram a consultar só o necessário;
  painel pagina de 50 em 50; telas da equipe carregadas sob demanda.
  Validado no emulador com ~6 mil documentos (17 verificações nas funções
  reais + 14 nas telas).
- Adicionado modo emulador (`VITE_USE_EMULATOR`) para testes locais.
- Nova tabela de preços (validada com o barbeiro): Corte 35, Barba 30,
  Pezinho 10, Pigmentação 25 (novo), Corte + Pigmentação 60, Luzes 100 (novo),
  Descoloração 130. Bigode removido. Testado no emulador: todos os serviços
  aceitos; preço antigo, serviço removido e duração errada negados.
  **Exige publicar as regras e o site juntos.**
- Novo serviço **Corte + Barba**: R$ 65 / 50 min (soma de Corte e Barba).
- Sábado: último início passou de 12:00 para 14:00.
- Botão 🗑 **Excluir** no painel da equipe (fase de testes), ligado por
  `PERMITIR_EXCLUIR` em `dados.js`. Apaga o pedido e libera o horário; não
  mexe na ocupação se o horário já foi reservado por outra pessoa. Clientes
  não veem o botão e as regras só deixam a equipe apagar (regras sem mudança).
  Testado no emulador (12 verificações).
- Campo `avisoEnviado` no agendamento + regra que permite ao dono marcá-lo uma
  vez (pedido pendente). **Exige publicar as regras e o site juntos.**
  Testado: 6 cenários novos + os 14 anteriores.
- Equipe pode criar agendamento/ocupação (botão "+ Agendar cliente").
  **Exige publicar as regras e o site juntos.** Testado: 3 cenários novos +
  14 + 6 anteriores.
