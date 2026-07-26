using Microsoft.EntityFrameworkCore;
using BarbeariaApi.Data;
using BarbeariaApi.DTOs;
using BarbeariaApi.Models;

namespace BarbeariaApi.Services;

public class AgendamentoService
{
    private readonly BarbeariaContext _context;

    public AgendamentoService(BarbeariaContext context)
    {
        _context = context;
    }

    public async Task<(bool Sucesso, string? Erro, AgendamentoResponseDto? Dados)> CriarAsync(CriarAgendamentoDto dto)
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
                        && a.Status != StatusAgendamento.Cancelado)
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
            Status = StatusAgendamento.Agendado
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
