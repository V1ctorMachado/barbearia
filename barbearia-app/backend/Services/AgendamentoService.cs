using Microsoft.EntityFrameworkCore;
using BarbeariaApi.Data;
using BarbeariaApi.DTOs;
using BarbeariaApi.Models;

namespace BarbeariaApi.Services;

public class AgendamentoService
{
    private readonly BarbeariaContext _context;
    private readonly int _horaAbertura;
    private readonly int _horaFechamento;

    public AgendamentoService(BarbeariaContext context, IConfiguration config)
    {
        _context = context;
        _horaAbertura = config.GetValue<int?>("Funcionamento:HoraAbertura") ?? 9;
        _horaFechamento = config.GetValue<int?>("Funcionamento:HoraFechamento") ?? 18;
    }

    public async Task<(bool Sucesso, string? Erro, AgendamentoResponseDto? Dados)> CriarAsync(
        CriarAgendamentoDto dto, StatusAgendamento statusInicial = StatusAgendamento.Agendado)
    {
        var servico = await _context.Servicos.FindAsync(dto.ServicoId);
        if (servico is null || !servico.Ativo)
            return (false, "Serviço inválido ou inativo.", null);

        var barbeiro = await _context.Barbeiros.FindAsync(dto.BarbeiroId);
        if (barbeiro is null || !barbeiro.Ativo)
            return (false, "Barbeiro inválido ou inativo.", null);

        var cliente = await _context.Clientes.FindAsync(dto.ClienteId);
        if (cliente is null)
            return (false, "Cliente não encontrado.", null);

        if (dto.DataHora < DateTime.UtcNow)
            return (false, "Não é possível agendar em uma data passada.", null);

        // Janela de tempo do novo agendamento
        var inicioNovo = dto.DataHora;
        var fimNovo = dto.DataHora.AddMinutes(servico.DuracaoMinutos);

        // Verifica conflito: mesmo barbeiro, horários que se sobrepõem, não cancelado
        var agendamentosBarbeiro = await _context.Agendamentos
            .Include(a => a.Servico)
            .Where(a => a.BarbeiroId == dto.BarbeiroId
                        && a.Status != StatusAgendamento.Cancelado
                        && a.Status != StatusAgendamento.Recusado)
            .ToListAsync();

        foreach (var existente in agendamentosBarbeiro)
        {
            var inicioExistente = existente.DataHora;
            var fimExistente = existente.DataHora.AddMinutes(existente.Servico!.DuracaoMinutos);

            // Duas janelas se sobrepõem se: inicioA < fimB E inicioB < fimA
            if (inicioNovo < fimExistente && inicioExistente < fimNovo)
                return (false, $"O barbeiro já possui um agendamento nesse horário ({inicioExistente:dd/MM HH:mm}).", null);
        }

        var agendamento = new Agendamento
        {
            DataHora = dto.DataHora,
            ClienteId = dto.ClienteId,
            BarbeiroId = dto.BarbeiroId,
            ServicoId = dto.ServicoId,
            Observacoes = dto.Observacoes,
            PrecoCobrado = servico.Preco,
            Status = statusInicial
        };

        _context.Agendamentos.Add(agendamento);
        await _context.SaveChangesAsync();

        return (true, null, MapearResponse(agendamento, cliente, barbeiro, servico));
    }

    public async Task<List<AgendamentoResponseDto>> ListarAsync(DateTime? data = null, int? barbeiroId = null)
    {
        var query = _context.Agendamentos
            .Include(a => a.Cliente)
            .Include(a => a.Barbeiro)
            .Include(a => a.Servico)
            .AsQueryable();

        if (data.HasValue)
        {
            var inicio = data.Value.Date;
            var fim = inicio.AddDays(1);
            query = query.Where(a => a.DataHora >= inicio && a.DataHora < fim);
        }

        if (barbeiroId.HasValue)
            query = query.Where(a => a.BarbeiroId == barbeiroId.Value);

        var lista = await query.OrderBy(a => a.DataHora).ToListAsync();

        return lista.Select(a => MapearResponse(a, a.Cliente!, a.Barbeiro!, a.Servico!)).ToList();
    }

    public async Task<bool> AtualizarStatusAsync(int id, StatusAgendamento status)
    {
        var agendamento = await _context.Agendamentos.FindAsync(id);
        if (agendamento is null) return false;

        agendamento.Status = status;
        await _context.SaveChangesAsync();
        return true;
    }

    // Lista os agendamentos de um cliente específico (histórico da área pública).
    public async Task<List<AgendamentoResponseDto>> ListarPorClienteAsync(int clienteId)
    {
        var lista = await _context.Agendamentos
            .Include(a => a.Cliente)
            .Include(a => a.Barbeiro)
            .Include(a => a.Servico)
            .Where(a => a.ClienteId == clienteId)
            .OrderByDescending(a => a.DataHora)
            .ToListAsync();

        return lista.Select(a => MapearResponse(a, a.Cliente!, a.Barbeiro!, a.Servico!)).ToList();
    }

    // Calcula os horários VAGOS de um barbeiro num dia, para um serviço de dada duração.
    // Devolve apenas os horários livres — nunca expõe quem ocupa os horários cheios.
    public async Task<(bool Sucesso, string? Erro, List<DateTime>? Horarios)> HorariosLivresAsync(
        int barbeiroId, int servicoId, DateTime data)
    {
        var servico = await _context.Servicos.FindAsync(servicoId);
        if (servico is null || !servico.Ativo)
            return (false, "Serviço inválido.", null);

        var barbeiro = await _context.Barbeiros.FindAsync(barbeiroId);
        if (barbeiro is null || !barbeiro.Ativo)
            return (false, "Barbeiro inválido.", null);

        var duracao = servico.DuracaoMinutos;
        var diaBase = data.Date;

        // Janela de funcionamento do dia
        var abertura = diaBase.AddHours(_horaAbertura);
        var fechamento = diaBase.AddHours(_horaFechamento);

        // Ocupações do barbeiro no dia (ignora cancelados/recusados).
        // Buscamos só os campos necessários — nada de dados de cliente.
        var ocupacoes = await _context.Agendamentos
            .Include(a => a.Servico)
            .Where(a => a.BarbeiroId == barbeiroId
                        && a.Status != StatusAgendamento.Cancelado
                        && a.Status != StatusAgendamento.Recusado
                        && a.DataHora >= diaBase
                        && a.DataHora < diaBase.AddDays(1))
            .Select(a => new { a.DataHora, a.Servico!.DuracaoMinutos })
            .ToListAsync();

        var livres = new List<DateTime>();
        var agora = DateTime.UtcNow;

        // Gera candidatos em passos do tamanho da duração do serviço.
        for (var inicio = abertura; inicio.AddMinutes(duracao) <= fechamento; inicio = inicio.AddMinutes(duracao))
        {
            var fim = inicio.AddMinutes(duracao);

            // Não oferece horários no passado
            if (inicio < agora) continue;

            // Verifica se colide com alguma ocupação existente
            var colide = ocupacoes.Any(o =>
            {
                var oInicio = o.DataHora;
                var oFim = o.DataHora.AddMinutes(o.DuracaoMinutos);
                return inicio < oFim && oInicio < fim; // regra de sobreposição
            });

            if (!colide) livres.Add(inicio);
        }

        return (true, null, livres);
    }

    private static AgendamentoResponseDto MapearResponse(Agendamento a, Cliente c, Barbeiro b, Servico s) => new()
    {
        Id = a.Id,
        DataHora = a.DataHora,
        Status = a.Status.ToString(),
        Observacoes = a.Observacoes,
        PrecoCobrado = a.PrecoCobrado,
        ClienteId = c.Id,
        ClienteNome = c.Nome,
        ClienteTelefone = c.Telefone,
        BarbeiroId = b.Id,
        BarbeiroNome = b.Nome,
        ServicoId = s.Id,
        ServicoNome = s.Nome,
        DuracaoMinutos = s.DuracaoMinutos
    };
}
