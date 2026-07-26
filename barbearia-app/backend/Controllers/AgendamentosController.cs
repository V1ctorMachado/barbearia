using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using BarbeariaApi.DTOs;
using BarbeariaApi.Services;

namespace BarbeariaApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize] // exige token válido em todos os endpoints deste controller
public class AgendamentosController : ControllerBase
{
    private readonly AgendamentoService _service;

    public AgendamentosController(AgendamentoService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> Listar([FromQuery] DateTime? data, [FromQuery] int? barbeiroId)
    {
        var lista = await _service.ListarAsync(data, barbeiroId);
        return Ok(lista);
    }

    [HttpPost]
    public async Task<IActionResult> Criar([FromBody] CriarAgendamentoDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var (sucesso, erro, dados) = await _service.CriarAsync(dto);
        if (!sucesso)
            return BadRequest(new { mensagem = erro });

        return CreatedAtAction(nameof(Listar), new { id = dados!.Id }, dados);
    }

    [HttpPatch("{id}/status")]
    public async Task<IActionResult> AtualizarStatus(int id, [FromBody] AtualizarStatusDto dto)
    {
        var ok = await _service.AtualizarStatusAsync(id, dto.Status);
        if (!ok)
            return NotFound(new { mensagem = "Agendamento não encontrado." });

        return NoContent();
    }
}
