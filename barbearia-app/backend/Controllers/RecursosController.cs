using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BarbeariaApi.Data;
using BarbeariaApi.Models;

namespace BarbeariaApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class BarbeirosController : ControllerBase
{
    private readonly BarbeariaContext _context;
    public BarbeirosController(BarbeariaContext context) => _context = context;

    [HttpGet]
    public async Task<IActionResult> Listar() =>
        Ok(await _context.Barbeiros.Where(b => b.Ativo).ToListAsync());

    [HttpGet("{id}")]
    public async Task<IActionResult> ObterPorId(int id)
    {
        var barbeiro = await _context.Barbeiros.FindAsync(id);
        return barbeiro is null ? NotFound() : Ok(barbeiro);
    }

    [HttpPost]
    public async Task<IActionResult> Criar([FromBody] Barbeiro barbeiro)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        _context.Barbeiros.Add(barbeiro);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(ObterPorId), new { id = barbeiro.Id }, barbeiro);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Atualizar(int id, [FromBody] Barbeiro barbeiro)
    {
        if (id != barbeiro.Id) return BadRequest();
        _context.Entry(barbeiro).State = EntityState.Modified;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Administrador")]
    public async Task<IActionResult> Desativar(int id)
    {
        var barbeiro = await _context.Barbeiros.FindAsync(id);
        if (barbeiro is null) return NotFound();
        barbeiro.Ativo = false; // soft delete: preserva histórico de agendamentos
        await _context.SaveChangesAsync();
        return NoContent();
    }
}

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ServicosController : ControllerBase
{
    private readonly BarbeariaContext _context;
    public ServicosController(BarbeariaContext context) => _context = context;

    [HttpGet]
    public async Task<IActionResult> Listar() =>
        Ok(await _context.Servicos.Where(s => s.Ativo).ToListAsync());

    [HttpGet("{id}")]
    public async Task<IActionResult> ObterPorId(int id)
    {
        var servico = await _context.Servicos.FindAsync(id);
        return servico is null ? NotFound() : Ok(servico);
    }

    [HttpPost]
    public async Task<IActionResult> Criar([FromBody] Servico servico)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        _context.Servicos.Add(servico);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(ObterPorId), new { id = servico.Id }, servico);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Atualizar(int id, [FromBody] Servico servico)
    {
        if (id != servico.Id) return BadRequest();
        _context.Entry(servico).State = EntityState.Modified;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Administrador")]
    public async Task<IActionResult> Desativar(int id)
    {
        var servico = await _context.Servicos.FindAsync(id);
        if (servico is null) return NotFound();
        servico.Ativo = false;
        await _context.SaveChangesAsync();
        return NoContent();
    }
}

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ClientesController : ControllerBase
{
    private readonly BarbeariaContext _context;
    public ClientesController(BarbeariaContext context) => _context = context;

    [HttpGet]
    public async Task<IActionResult> Listar([FromQuery] string? busca)
    {
        var query = _context.Clientes.AsQueryable();
        if (!string.IsNullOrWhiteSpace(busca))
            query = query.Where(c => c.Nome.Contains(busca) || c.Telefone.Contains(busca));
        return Ok(await query.OrderBy(c => c.Nome).ToListAsync());
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> ObterPorId(int id)
    {
        var cliente = await _context.Clientes.FindAsync(id);
        return cliente is null ? NotFound() : Ok(cliente);
    }

    [HttpPost]
    public async Task<IActionResult> Criar([FromBody] Cliente cliente)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        _context.Clientes.Add(cliente);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(ObterPorId), new { id = cliente.Id }, cliente);
    }
}
