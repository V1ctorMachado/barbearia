# Barbearia — Sistema de Agendamentos

Aplicação full-stack para gestão de uma barbearia: cadastro de barbeiros, serviços e clientes, com agenda diária e controle de status dos atendimentos.

- **Backend:** ASP.NET Core 8 (Web API) + Entity Framework Core
- **Frontend:** Angular 17 (standalone components + signals)
- **Banco:** SQLite por padrão (zero configuração). SQL Server opcional.

## Estrutura

```
barbearia-app/
├── backend/          API em C#
│   ├── Controllers/  Endpoints REST
│   ├── Models/       Entidades do domínio
│   ├── DTOs/         Objetos de transferência
│   ├── Services/     Regras de negócio (ex.: conflito de horário)
│   └── Data/         DbContext + seed inicial
└── frontend/         App Angular
    └── src/app/
        ├── components/  Tela de agenda
        ├── services/    Cliente HTTP da API
        └── models/      Tipos TypeScript
```

## Como rodar

### 1. Backend

Pré-requisito: [.NET 9 SDK](https://dotnet.microsoft.com/download)

```bash
cd backend
dotnet restore
dotnet run
```

> Se você já tinha compilado uma versão anterior deste projeto (que mirava
> .NET 8), apague as pastas `bin/` e `obj/` dentro de `backend/` antes de
> rodar, para limpar o cache da versão antiga:
> no Windows, `rmdir /s /q bin obj` a partir da pasta `backend`.

A API sobe em `http://localhost:5000`. O banco SQLite (`barbearia.db`) é criado
automaticamente já com barbeiros e serviços de exemplo. O Swagger fica em
`http://localhost:5000/swagger`.

> Se a porta for diferente, ajuste `baseUrl` em
> `frontend/src/app/services/api.service.ts`.

### 2. Frontend

Pré-requisito: [Node.js 18+](https://nodejs.org)

```bash
cd frontend
npm install
npm start
```

O app abre em `http://localhost:4200`.

## Usar SQL Server em vez de SQLite

1. Em `appsettings.json`, troque a `DefaultConnection` por algo como:
   `Server=localhost;Database=Barbearia;Trusted_Connection=True;TrustServerCertificate=True`
2. Em `Program.cs`, troque `options.UseSqlite(...)` por `options.UseSqlServer(...)`.

## Autenticação

O sistema usa **JWT (JSON Web Token)**. O fluxo é: você faz login uma vez,
recebe um token, e o Angular anexa esse token automaticamente em toda
requisição seguinte. O backend valida o token sem manter sessão em memória.

- **Usuário padrão** (criado automaticamente na primeira execução):
  `admin` / `admin123` — **troque a senha assim que possível.**
- O token expira em 8 horas (configurável em `appsettings.json` → `Jwt:HorasValidade`).
- Novos usuários só podem ser criados por um administrador
  (endpoint `POST /api/auth/registrar`).
- Há dois papéis: **Atendente** (uso diário) e **Administrador**
  (pode cadastrar usuários e desativar barbeiros/serviços).

> ⚠️ **Importante — chave secreta:** antes de usar em produção, troque
> `Jwt:Chave` no `appsettings.json` por uma chave longa e secreta (mínimo
> 32 caracteres). Nunca versione a chave real num repositório público.

> ⚠️ **Se você já rodou uma versão anterior**, o `barbearia.db` existente tem
> uma estrutura desatualizada (esta versão adicionou o vínculo entre conta e
> cliente e novos status de agendamento). Como o projeto usa `EnsureCreated()`
> (que não altera bancos existentes), **apague o arquivo `barbearia.db`** e
> deixe a aplicação recriá-lo na próxima inicialização. Isso recria também os
> dados de exemplo e o usuário admin. No Windows, a partir da pasta `backend`:
> `del barbearia.db`
> Isso também recria os dados de exemplo.

### Endpoints de autenticação

| Método | Rota                    | Acesso        | Descrição                      |
|--------|-------------------------|---------------|--------------------------------|
| POST   | `/api/auth/login`       | Público       | Retorna token JWT              |
| POST   | `/api/auth/registrar`   | Administrador | Cadastra novo usuário          |
| GET    | `/api/auth/eu`          | Autenticado   | Dados do usuário do token      |

## Dois acessos: cliente e equipe

O sistema tem duas áreas distintas sobre o mesmo banco de dados:

**Área do cliente (pública)** — onde o cliente final se cadastra e agenda sozinho:
- `/` ou `/portal` — página inicial do cliente (exige login de cliente)
- `/cadastro` — cliente cria a própria conta
- `/login-cliente` — login do cliente

Fluxo: o cliente cria conta, escolhe barbeiro → serviço → data, o sistema
mostra **apenas os horários livres** daquele barbeiro, ele escolhe um e
confirma. O pedido entra como **Pendente**. Ele também vê o histórico dele
em "Meus agendamentos" e pode cancelar.

**Painel interno (equipe)** — onde você opera a barbearia:
- `/login` — login da equipe (admin/atendente)
- `/agenda` — agenda do dia, cadastro de agendamentos pelo balcão

Novidade: agendamentos **Pendentes** (feitos por clientes) aparecem na agenda
com botões **Aprovar** e **Recusar**. Aprovar vira "Agendado"; recusar vira
"Recusado". Agendamentos criados pelo balcão continuam caindo direto como
"Agendado" (você não precisa se aprovar).

### Como os dados do cliente ficam privados

O cálculo de horários livres devolve só os horários vagos — nunca quem ocupa
os cheios. E cada endpoint da área do cliente lê o identificador do cliente
de dentro do token de login, não de um parâmetro enviado pelo navegador.
Assim, um cliente não consegue ver nem agendar em nome de outro.

## Endpoints principais

| Método | Rota                              | Descrição                          |
|--------|-----------------------------------|------------------------------------|
| GET    | `/api/barbeiros`                  | Lista barbeiros ativos             |
| GET    | `/api/servicos`                   | Lista serviços ativos              |
| GET    | `/api/clientes?busca=`            | Lista/busca clientes               |
| POST   | `/api/clientes`                   | Cadastra cliente                   |
| GET    | `/api/agendamentos?data=&barbeiroId=` | Agenda filtrada por dia/barbeiro |
| POST   | `/api/agendamentos`               | Cria agendamento (valida conflito) |
| PATCH  | `/api/agendamentos/{id}/status`   | Atualiza status                    |

> Todos os endpoints acima exigem o cabeçalho `Authorization: Bearer {token}`.
> As rotas de desativar barbeiro/serviço exigem papel de Administrador.

## Detalhes de implementação

- **Conflito de horário:** ao agendar, o serviço verifica se a janela
  (início + duração do serviço) se sobrepõe a outro atendimento do mesmo
  barbeiro. Duas janelas colidem quando `inícioA < fimB E inícioB < fimA`.
- **Preço congelado:** o valor cobrado é gravado no agendamento no momento
  da criação, então reajustes futuros no preço do serviço não alteram o
  histórico.
- **Soft delete:** barbeiros e serviços são desativados (`ativo = false`),
  nunca apagados, para preservar o histórico de agendamentos.
