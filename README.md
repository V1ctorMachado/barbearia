# 💈 Barbearia Mageschi — Agendamento Online

Sistema de agendamento da Barbearia Mageschi. O cliente marca o horário pelo
celular, e a barbearia aprova, acompanha e organiza a agenda em um painel.

> Como instalar e publicar: [INSTALACAO.md](INSTALACAO.md) ·
> Banco de dados e regras: [FIREBASE.md](FIREBASE.md)

---

## Para o cliente

### Criar conta e entrar
- Cadastro só com **nome, celular (WhatsApp) e senha**, sem e-mail.
- Para entrar, basta o **celular e a senha**. O número pode ser digitado de
  qualquer jeito: com ou sem +55, parênteses ou traço.
- O login fica salvo no aparelho, então não é preciso entrar toda vez.
- Esqueceu a senha? O link no login abre o WhatsApp do **suporte**, com a
  mensagem pronta.

### Agendar um horário
1. **Escolhe o serviço**, com o preço e a duração de cada um.
2. **Escolhe a data** e toca em **Ver horários**.
3. O sistema mostra **só os horários livres** do dia, considerando:
   - o horário de funcionamento;
   - o intervalo de almoço;
   - a duração do serviço, para não encavalar com outro cliente;
   - **encaixe:** o horário em que cada atendimento termina também aparece,
     para o barbeiro não ficar parado entre um cliente e outro;
   - os dias bloqueados pela barbearia (feriados, folgas).
4. **Escolhe o horário** e toca em **Confirmar agendamento**.
5. O pedido entra como **"Aguardando confirmação"** até a barbearia aprovar.

Ao tocar em **Confirmar agendamento**, o site já **abre o WhatsApp da
barbearia** com o aviso pronto (nome, serviço, valor, dia e horário). O cliente
só precisa tocar em **Enviar**. Se o navegador bloquear a abertura, aparece o
botão **💬 Avisar a barbearia no WhatsApp** como alternativa. O botão
funciona **uma vez só** por agendamento; depois aparece **"✅ Aviso enviado!"**
(vale mesmo recarregando a página ou entrando por outro celular).

Se duas pessoas tentarem o mesmo horário ao mesmo tempo, **só uma consegue**.
A outra recebe um aviso e escolhe outro horário.

### Lembrete na agenda do celular
Se o horário for **daqui a 3 dias ou mais**, a tela de confirmação mostra
"Seu horário é daqui a X dias" e o botão **📅 Adicionar à agenda**:
- **iPhone:** abre o Calendário com o evento pronto e **aviso no dia, 1 hora
  antes** do horário (agendado às 11h, aviso às 10h).
- **Android:** abre o **Google Agenda** com o evento pronto (e a opção de
  baixar o evento para outro app de agenda).

O evento tem o serviço, o valor, a duração, o **endereço** da barbearia e o pedido de chegar com
antecedência. O site não consegue criar o evento sozinho: o cliente só toca no
botão e salva.

### Meus agendamentos
- Lista dos agendamentos do cliente, com a situação de cada um.
- **📅 Adicionar à agenda** em cada agendamento futuro ativo.
- **Cancelar** um agendamento ativo, com confirmação antes.
- **💬 Avisar** a barbearia no WhatsApp, em pedidos ainda aguardando confirmação.
- O histórico fica guardado, inclusive os cancelados.

### Contato
- Botão flutuante do **WhatsApp** da barbearia.
- **Aviso no topo** do site com novidades e recados da barbearia.

---

## Para a equipe (painel)

Acesso por um login separado, **só para quem é da equipe**.
O atalho criado na tela inicial do celular a partir de `/staff` abre direto no
painel (aparece como **Mageschi Equipe**).

### Agenda
- Mostra os **próximos agendamentos** (de hoje em diante), de 50 em 50, com o
  botão **Carregar mais**.
- **Filtro por data**, inclusive dias passados.
- **Filtro por situação:** ativos, só pendentes, só confirmados, todos etc.
- Cada card mostra o cliente, o e-mail, o telefone, o serviço, o horário e o
  valor.
- **Faturamento** somado do dia ou da lista exibida.

### Agendar cliente (balcão ou WhatsApp)
Botão **+ Agendar cliente** no painel, para marcar horário de quem não usa o
site:
- **nome**, **celular** (opcional), **serviço** e **data**;
- mostra **só os horários livres**, com a mesma regra da tela do cliente;
- o agendamento já entra como **Agendado** e o horário fica ocupado para os
  outros clientes na hora.

O cliente não precisa de conta. O agendamento aparece só no painel, com o
💬 telefone para mandar a mensagem de confirmação.

### Ações em cada agendamento
| Ação | Quando |
|---|---|
| ✓ **Aprovar** / ✕ **Recusar** | pedido aguardando confirmação |
| ✓ **Confirmar** | agendamento aprovado, quando o cliente confirma presença |
| ✓✓ **Concluir** | depois do atendimento |
| ✕ **Cancelar** | agendamento aprovado ou confirmado |
| 🗑 **Excluir** | apaga de vez (disponível na fase de testes) |

Recusar, cancelar e excluir **pedem confirmação** antes.

### Mensagem de confirmação no WhatsApp
Tocar no **💬 telefone do cliente** abre o WhatsApp com uma mensagem pronta:
agradece o agendamento, mostra o serviço, o dia, o horário e o valor, pede
para **chegar com antecedência** e, em caso de desistência, **avisar com 24 horas
de antecedência**.

### Faturamento
Tela **📊 Faturamento**, aberta pelo botão no topo do painel, com visão por
**mês** ou por **ano**:
- **Faturado:** soma dos atendimentos **concluídos (✓✓)** e quantidade.
- **Ticket médio** por atendimento.
- **A receber:** agendamentos ainda não concluídos.
- **Cancelados / recusados:** quantos foram, sem entrar na soma.
- **Gráfico** do faturado por dia (mês) ou por mês (ano). Ao tocar numa barra,
  aparecem o valor e a quantidade de atendimentos.
- **Por serviço:** quantidade, total e % de cada serviço.
- **Aviso** de atendimentos que já passaram e não foram marcados como concluídos.
- Os mesmos números também em **tabela**.

### Configurações
- **WhatsApp da barbearia:** o número usado no botão do site.
- **Aviso no topo do site:** texto livre (promoções, recados, novidades).
- **Datas bloqueadas:** um dia ou um período (férias, feriados), com motivo.
  Nesses dias nenhum horário aparece para o cliente.

---

## Serviços

| Serviço | Preço | Duração |
|---|---|---|
| Corte | R$ 35 | 30 min |
| Barba | R$ 30 | 20 min |
| Corte + Barba | R$ 65 | 50 min |
| Pezinho | R$ 10 | 10 min |
| Pigmentação | R$ 25 | 20 min |
| Corte + Pigmentação | R$ 60 | 50 min |
| Luzes | R$ 100 | 90 min |
| Descoloração | R$ 130 | 90 min |

## Horário de funcionamento

| Dia | Horário de atendimento (último início) |
|---|---|
| Terça a sexta | 8:30–11:00 e 13:30–19:00 |
| Sábado | 8:30–14:00 |
| Domingo e segunda | Fechado |

---

## Situação de um agendamento

```
Aguardando confirmação ──► Agendado ──► Confirmado ──► Concluído
          │                   │              │
          ▼                   └──────┬───────┘
       Recusado                      ▼
                                 Cancelado
```

- **Cancelado** ou **Recusado:** o horário volta a ficar livre para outros
  clientes, e o registro continua no histórico.
- O cliente também pode cancelar enquanto o pedido estiver aguardando
  confirmação.

---

## Segurança e privacidade

- Cada cliente **só vê os próprios agendamentos e dados**.
- Os outros clientes enxergam apenas que um horário está ocupado, **sem nome
  nem contato**.
- Só a equipe aprova, recusa, conclui, exclui e altera as configurações.
- **Preço e duração são conferidos no servidor:** ninguém consegue agendar
  pagando um valor diferente da tabela.
- Ao cancelar, o cliente só muda a situação do pedido, não a data nem o valor.
- Ninguém consegue "travar" a agenda criando reservas falsas.

## Desempenho e conexão

- Feito para o **celular**.
- Cada tela busca só o necessário (um dia, ou 50 agendamentos por vez), então
  continua rápido mesmo com anos de histórico.
- Se a internet falhar, o site **avisa e oferece "Tentar novamente"**, em vez
  de ficar carregando para sempre.

---

## Endereços

| Quem | Endereço | O que é |
|---|---|---|
| Cliente | `/cadastro` | Criar conta |
| Cliente | `/login` | Entrar |
| Cliente | `/` | Agendar e ver "Meus agendamentos" |
| Equipe | `/staff` | Login da equipe |
| Equipe | `/painel` | Agenda e ações |
| Equipe | `/faturamento` | Faturamento do mês e do ano |
| Equipe | `/configuracoes` | WhatsApp, aviso e datas bloqueadas |

---

**Tecnologia:** React + Vite · Firebase (login e banco de dados) · hospedagem na Vercel.
