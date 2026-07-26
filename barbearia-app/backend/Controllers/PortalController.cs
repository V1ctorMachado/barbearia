using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BarbeariaApi.Data;
using BarbeariaApi.DTOs;
using BarbeariaApi.Models;
using BarbeariaApi.Services;

namespace BarbeariaApi.Controllers;

// Área do cliente: só quem tem papel "Cliente" acessa.
// Todos os endpoints operam sobre o ClienteId lido do TOKEN, nunca de um
// parâmetro enviado pelo cliente — assim ninguém acessa dados de outra pessoa.
[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Cliente")]
public class PortalController : ControllerBase
{
    private readonly AgendamentoService _agendamentos;
    private readonly BarbeariaContext _context;

    public PortalController(AgendamentoService agendamentos, BarbeariaContext context)
    {
        _agendamentos = agendamentos;
        _context = context;
    }

    // Lê o ClienteId de dentro do token do usuário logado.
    private int? ClienteIdDoToken()
    {
        var valor = User.FindFirst("clienteId")?.Value;
        return int.TryParse(valor, out var id) ? id : null;
    }

    // Lista pública de barbeiros ativos (para o cliente escolher)
    [HttpGet("barbeiros")]
    public async Task<IActionResult> Barbeiros() =>
        Ok(await _context.Barbeiros.Where(b => b.Ativo)
            .Select(b => new { b.Id, b.Nome, b.Especialidades })
            .ToListAsync());

    // Lista pública de serviços ativos
    [HttpGet("servicos")]
    public async Task<IActionResult> Servicos() =>
        Ok(await _context.Servicos.Where(s => s.Ativo)
            .Select(s => new { s.Id, s.Nome, s.Descricao, s.Preco, s.DuracaoMinutos })
            .ToListAsync());

    // Horários livres de um barbeiro para um serviço numa data.
    // Devolve só os horários vagos — não expõe agendamentos de outros clientes.
    [HttpGet("horarios-livres")]
    public async Task<IActionResult> HorariosLivres(
        [FromQuery] int barbeiroId, [FromQuery] int servicoId, [FromQuery] DateTime data)
    {
        var (sucesso, erro, horarios) = await _agendamentos.HorariosLivresAsync(barbeiroId, servicoId, data);
        if (!sucesso)
            return BadRequest(new { mensagem = erro });

        return Ok(horarios);
    }

    // Cliente cria um agendamento — entra como Pendente, aguardando aprovação.
    [HttpPost("agendar")]
    public async Task<IActionResult> Agendar([FromBody] AgendarClienteDto dto)
    {
        var clienteId = ClienteIdDoToken();
        if (clienteId is null)
            return Unauthorized(new { mensagem = "Conta de cliente inválida." });

        var criacao = new CriarAgendamentoDto
        {
            ClienteId = clienteId.Value, // sempre o do token, ignora qualquer id externo
            BarbeiroId = dto.BarbeiroId,
            ServicoId = dto.ServicoId,
            DataHora = dto.DataHora,
            Observacoes = dto.Observacoes
        };

        var (sucesso, erro, dados) = await _agendamentos.CriarAsync(criacao, StatusAgendamento.Pendente);
        if (!sucesso)
            return BadRequest(new { mensagem = erro });

        return Ok(dados);
    }

    // Histórico do próprio cliente
    [HttpGet("meus-agendamentos")]
    public async Task<IActionResult> MeusAgendamentos()
    {
        var clienteId = ClienteIdDoToken();
        if (clienteId is null)
            return Unauthorized(new { mensagem = "Conta de cliente inválida." });

        var lista = await _agendamentos.ListarPorClienteAsync(clienteId.Value);
        return Ok(lista);
    }

    // Cliente cancela um agendamento seu (só os próprios, e só se ainda não concluído)
    [HttpPatch("cancelar/{id}")]
    public async Task<IActionResult> Cancelar(int id)
    {
        var clienteId = ClienteIdDoToken();
        if (clienteId is null)
            return Unauthorized();

        var agendamento = await _context.Agendamentos.FindAsync(id);
        if (agendamento is null || agendamento.ClienteId != clienteId.Value)
            return NotFound(new { mensagem = "Agendamento não encontrado." });

        if (agendamento.Status == StatusAgendamento.Concluido)
            return BadRequest(new { mensagem = "Não é possível cancelar um atendimento já concluído." });

        agendamento.Status = StatusAgendamento.Cancelado;
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
