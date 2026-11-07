# claude2.md — Registro do projeto Barbearia Mageschi

Memória das ações feitas com o Claude neste projeto e próximos passos.
Detalhes técnicos do banco e das regras: ver `FIREBASE.md`.

---

## 1. Situação atual (07/11/2026)

- **Stack:** React 18 + Vite · Firebase Auth + Firestore · hospedagem Vercel.
- **Status:** fase de testes. Botão 🗑 de excluir ligado no painel (`PERMITIR_EXCLUIR = true`).
- **Comercial:** sistema oferecido ao barbeiro por **R$ 1.500 (pagamento único)**
  ou R$ 45/mês. Acordo formal: **sem cobrança de manutenção** (erros, lentidão,
  problemas). Sugerido deixar por escrito o que é manutenção × recurso novo.

### Pendências
- [ ] Trocar `PERMITIR_EXCLUIR` para `false` antes de abrir para clientes.
- [ ] Confirmar duração da **Pigmentação avulsa** (hoje 20 min).
- [ ] Se fechar pagamento único: migrar hospedagem para **Firebase Hosting**
      (Vercel Hobby não permite uso comercial; Pro custa US$ 20/mês).
- [ ] Decidir sobre a **grade de horários** (hoje avança pela duração do serviço;
      opção: de 30 em 30 min).
- [ ] Decidir sobre **pagamento online** (plano na seção 4).
- [ ] Painel: bloco "Pendências anteriores" + opção "Anteriores" no filtro (proposto em 07/11).

---

## 2. Histórico de ações

### 06/11/2026
1. **Avaliação inicial** do .zip: 12 problemas encontrados (segurança, fluxo,
   organização).
2. **Regras do Firestore** revisadas e testadas no emulador:
   horário cancelado ficava travado; cliente podia gravar preço falso,
   criar ocupação fantasma, alterar dados ao cancelar, cancelar concluído.
3. **Correções no site:**
   - trocar data/serviço limpa os horários (evita marcar horário errado);
   - aviso "horário ocupado" não some mais;
   - confirmação ao cancelar (cliente) e ao recusar/cancelar (equipe);
   - telefone do cliente no painel (abre WhatsApp);
   - botão flutuante de WhatsApp só no site do cliente;
   - removida cópia duplicada do projeto, `FaixaAviso` e `avisoAtivo` sem uso;
   - criados `.env.example`, `.gitignore`, `firestore.rules`.
4. **Histórico preservado:** pedido (`agendamentos`, ID automático) separado
   do horário (`ocupacoes`, ID fixo). Testado: 14 cenários.
5. **`FIREBASE.md`** criado (documentação do Firebase dentro do projeto).
6. **Desempenho:** "Ver horários" lê só o dia (4 leituras em vez de 3.003);
   painel paginado de 50 em 50 com "Carregar mais"; telas da equipe carregadas
   sob demanda; React/Firebase em arquivos separados. Modo emulador
   (`VITE_USE_EMULATOR`). Validado com ~6 mil documentos.
7. **Preços novos** (do barbeiro): Corte 35 · Barba 30 · Corte + Barba 65 ·
   Pezinho 10 · Pigmentação 25 · Corte + Pigmentação 60 · Luzes 100 ·
   Descoloração 130. Bigode removido. Regras atualizadas e testadas.
8. **Sábado:** último início às 14:00.
9. **Botão Excluir** no painel (fase de testes), só para a equipe. Testado.

### 07/11/2026
10. **Custos levantados:**
    - Firebase Spark: grátis (50 mil leituras / 20 mil gravações por dia).
    - Vercel: Hobby só uso não comercial; Pro US$ 20/mês.
    - Domínio .com.br: ~R$ 40/ano.
    - Booksy (referência): US$ 29,99/mês + US$ 20 por profissional extra.
11. **Precificação:** desenvolvimento estimado R$ 3–8 mil (freelancer);
    entrega sem mensalidade R$ 2–4 mil; Victor fechou proposta de R$ 1.500.
    Empate com R$ 45/mês: ~34 meses. Mensagem para o barbeiro revisada.
12. **Pagamento online:** pesquisadas taxas e arquitetura (seção 4).
13. **Repasse da taxa:** como receber 100% no cartão/Pix repassando a taxa ao
    cliente (Lei 13.455/2017) — seção 3.
14. Agendamento de um "Renan" apareceu no site publicado: não veio dos testes
    (todos rodaram só no emulador local). Alguém real se cadastrou pelo link;
    conferir em Authentication / `agendamentos.criadoEm`.
15. **Mensagem de confirmação no WhatsApp:** no painel, clicar no telefone
    (💬) abre o WhatsApp do cliente com a mensagem pronta (nome, serviço,
    dia, data, hora, preço; pede ✅ para confirmar ou ❌ para recusar).
    Texto editável em `MENSAGEM_CONFIRMACAO` (`src/lib/dados.js`). O envio
    é manual (o wa.me só preenche); envio automático exigiria a API oficial
    do WhatsApp Business. Testado no emulador.
16. **Travamento no celular** (ao confirmar o agendamento e depois "Carregando…"
    infinito, mesmo limpando o cache). O site em si funcionou no teste em
    celular simulado (build de produção). Causa provável: a conexão contínua
    (streaming) do Firestore fica "aberta" sem respostas em algumas redes
    móveis/proxies/antivírus, e o site esperava sem limite. Correções:
    - **long polling** forçado (`src/lib/firebase.js`);
    - **limite de tempo** em todas as operações (`src/lib/tempo.js`:
      10 s leitura / 15 s gravação), com mensagens claras;
    - tela **"Sem conexão" + "Tentar novamente"** no lugar do "Carregando…"
      infinito; login e cadastro também com limite;
    - recarga automática se um arquivo do painel falhar ao baixar após
      republicar o site.
    Testado bloqueando o Firestore: mensagem em 15 s ao confirmar, tela de
    conexão em 11 s, recupera ao voltar a conexão.
    **Se voltar a acontecer:** anotar celular, navegador e rede (Wi-Fi/4G),
    e testar em outra rede e no computador.
17. **README reescrito** para mostrar o que o sistema faz (cliente, painel,
    serviços, horários, status, segurança). As instruções de instalação e
    publicação foram movidas para **`INSTALACAO.md`**.
18. "Agendamentos perdidos" após publicar: **não foram perdidos**. O do Renan
    (06/11 18:00, formato antigo, R$ 30) estava no Firestore. Ele não aparecia
    porque o painel sem data mostra só de hoje em diante. Proposto mostrar
    "Pendências anteriores" no painel e a opção "Anteriores" no filtro
    (ainda não aplicado). O e-mail dele foi digitado errado ("hotmail.con").
19. **Tela de Faturamento** (`/faturamento`, botão 📊 no painel): mês/ano,
    faturado (só concluídos ✓✓), ticket médio, a receber, cancelados,
    gráfico por dia/mês, tabela por serviço, aviso de atendimentos passados
    não concluídos, tabela de dados. Totais conferidos no emulador contra uma
    conta feita à parte (480 agendamentos; mês, mês anterior e ano batem).

---

## 3. Taxas de pagamento (consultadas em 07/11/2026)

| | Pix | Cartão de crédito | Mensalidade |
|---|---|---|---|
| Mercado Pago (Checkout Pro) | 0,99% | 4,98% (na hora) · 2,95% (30 dias) | não |
| Asaas | R$ 1,99 por Pix | 2,99% + R$ 0,49 | não |

Exemplo corte R$ 35: Pix Mercado Pago → recebe **R$ 34,65**; cartão na hora →
R$ 33,26; Pix Asaas → R$ 33,01. **Escolha recomendada: Mercado Pago.**

### Receber 100% do valor (repasse da taxa)
Nenhuma operadora cobra taxa zero, mas o barbeiro pode receber o valor cheio
**repassando a taxa ao cliente** — permitido pela **Lei 13.455/2017** (preço
diferente por forma de pagamento), desde que informado claramente.

Fórmula: **valor a cobrar = valor desejado ÷ (1 − taxa)**

| Forma | Taxa | Cobrar do cliente | Barbeiro recebe |
|---|---|---|---|
| Cartão, recebendo na hora | 4,98% | R$ 36,84 | R$ 35,00 |
| Cartão, recebendo em 30 dias | 2,95% | R$ 36,07 | R$ 35,00 |
| Pix | 0,99% | R$ 35,35 | R$ 35,00 |

No site: o cliente escolhe Pix ou cartão **antes** de pagar e já vê o valor
final; o servidor cria a cobrança só com aquela forma e o valor certo (o
Checkout Pro tem preço único para todas as formas).
Alternativa mais aceita: **desconto no Pix** (ex.: R$ 35 no Pix, R$ 37 no cartão).

---

## 4. Plano: servidor + API do Mercado Pago

### 4.1 Por que precisa de servidor
- A **chave secreta** (Access Token) do Mercado Pago não pode ficar no navegador.
- A confirmação de pagamento chega por **webhook** (o Mercado Pago chama uma URL
  do servidor). Só o servidor pode marcar um agendamento como pago — as regras
  do Firestore impedem o cliente de fazer isso.

### 4.2 Arquitetura

```
Cliente (React)                Cloud Functions (servidor)          Mercado Pago
     │ 1. escolhe horário             │                                  │
     │──── criarPagamento() ─────────▶│ 2. reserva horário               │
     │                                │    (status: aguardando_pagamento)│
     │                                │ 3. cria preferência ────────────▶│
     │◀──── link de pagamento ────────│                                  │
     │ 4. paga (Pix / cartão) ───────────────────────────────────────────▶│
     │                                │◀──── 5. webhook ─────────────────│
     │                                │ 6. valida assinatura + consulta  │
     │                                │    o pagamento na API ──────────▶│
     │                                │ 7. status: agendado (pago)       │
     │◀── 8. tela "pagamento ok" ─────│                                  │
                                      │ 9. a cada 5 min: libera horários │
                                      │    não pagos há +15 min          │
```

### 4.3 Peças a construir

**Infraestrutura**
- Firebase no plano **Blaze** (exige cartão; cota grátis de 2 milhões de
  execuções/mês — custo esperado ≈ R$ 0). Configurar **alerta de orçamento**.
- Pasta `functions/` (Node.js) com o SDK `mercadopago` e `firebase-admin`.
- Segredos guardados no Firebase (`firebase functions:secrets:set`):
  `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`. Nunca no código nem no `.env` do site.
- Conta Mercado Pago **do barbeiro** → "Suas integrações" → criar aplicação →
  credenciais de **teste** e de **produção**.

**Funções (servidor)**
| Função | Tipo | O que faz |
|---|---|---|
| `criarPagamento` | chamável (`onCall`, exige login) | Valida serviço/preço pela tabela do servidor, reserva o horário numa transação (`aguardando_pagamento`, expira em 15 min), cria a preferência no MP com `external_reference` = id do agendamento, `notification_url` = webhook, `expires` = 15 min. Devolve o link. |
| `webhookMercadoPago` | HTTP (`onRequest`) | Valida o header `x-signature` (HMAC SHA-256 de `id:{data.id};request-id:{x-request-id};ts:{ts};` com o segredo). Consulta o pagamento na API (nunca confia só no corpo do aviso). Se `approved` e valor correto → agendamento `agendado`, `pago: true`, guarda `pagamentoId`. Responde 200 em até 22 s. Idempotente (aviso repetido não duplica nada). |
| `liberarNaoPagos` | agendada (a cada 5 min) | Pedidos `aguardando_pagamento` vencidos → `expirado`, libera o horário. |
| `reembolsar` | chamável (só equipe) | Estorna pelo MP conforme a política e marca `reembolsado`. |

**Banco (Firestore)**
- Novos status: `aguardando_pagamento`, `expirado`, `reembolsado`.
- Novos campos no agendamento: `pago`, `pagamentoId`, `valorPago`, `metodo`
  (pix/cartão), `expiraEm`.
- **Regras:** cliente **não** pode gravar `pago`/`pagamentoId`/status de
  pagamento — só o servidor (Admin SDK ignora regras). A criação do pedido
  passa a ser feita pela função, não mais direto pelo site.
- Tabela de preços passa a ser lida pelo servidor (fonte única), o que permite
  mover os serviços para o Firestore e editar pelo painel.

**Site (React)**
- Portal: botão "Pagar e agendar" → chama `criarPagamento` → redireciona ao
  Checkout Pro → volta para `/pagamento/sucesso`, `/pendente` ou `/falha`.
- "Meus agendamentos": selo "Pago" / "Aguardando pagamento" + botão "Pagar"
  enquanto não expirar.
- Painel: selo de pago, método, valor líquido; botão "Reembolsar".
- Configurações: ligar/desligar pagamento online; modo "sinal" (ex.: 30%)
  ou valor integral.

### 4.4 Decisões de negócio necessárias antes de começar
1. Pagamento **obrigatório** para agendar, ou opcional (pagar no local)?
2. Valor **integral** ou **sinal**?
3. **Política de cancelamento/reembolso** (ex.: até 24 h antes devolve 100%;
   depois, não devolve).
4. Quem paga a taxa (barbeiro absorve, repassa ao cliente ou dá desconto no
   Pix)? — ver "Receber 100% do valor" na seção 3.
5. Prazo de recebimento do cartão (na hora 4,98% × 30 dias 2,95%).

### 4.5 Etapas e estimativa
| Etapa | Estimativa |
|---|---|
| Blaze + estrutura `functions/` + segredos | 0,5 dia |
| `criarPagamento` + reserva com expiração | 1 dia |
| Webhook com validação + consulta + idempotência | 1 dia |
| Expiração automática + reembolso | 0,5 dia |
| Telas (portal, meus agendamentos, painel, retorno) | 1 dia |
| Regras do Firestore + testes no emulador (Functions + Firestore) | 1 dia |
| Testes com credenciais de teste do MP (Pix e cartão de teste) | 0,5 dia |
| Publicação com credenciais de produção + acompanhamento | 0,5 dia |
| **Total** | **~6 dias de trabalho** |

### 4.6 Alternativa simples (sem servidor)
Mostrar a **chave Pix** da barbearia na confirmação ("pague o sinal e envie o
comprovante"); a equipe marca como pago no painel. Sem taxa, sem servidor,
poucas horas de trabalho. Desvantagem: conferência manual.

### 4.7 Fontes
- Mercado Pago — taxas Checkout Pro: https://www.mercadopago.com.br/ferramentas-para-vender/check-out
- Mercado Pago — notificações/webhooks: https://mercadopago.com.br/developers/es/docs/order/online-payments/notifications
- Asaas — preços e taxas: https://www.asaas.com/precos-e-taxas
- Firebase — Cloud Functions (Blaze e cota grátis): https://firebase.google.com/docs/functions/faq-and-troubleshooting
- Firebase — preços do Firestore: https://firebase.google.com/docs/firestore/pricing
- Vercel — plano Hobby: https://vercel.com/docs/plans/hobby
