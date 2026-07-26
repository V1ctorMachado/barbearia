using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using BarbeariaApi.DTOs;
using BarbeariaApi.Services;

namespace BarbeariaApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AuthService _auth;

    public AuthController(AuthService auth)
    {
        _auth = auth;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var (sucesso, erro, dados) = await _auth.LoginAsync(dto);
        if (!sucesso)
            return Unauthorized(new { mensagem = erro });

        return Ok(dados);
    }

    // Registro público: qualquer pessoa pode criar uma conta de cliente.
    [HttpPost("registrar-cliente")]
    [AllowAnonymous]
    public async Task<IActionResult> RegistrarCliente([FromBody] RegistrarClienteDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var (sucesso, erro, dados) = await _auth.RegistrarClienteAsync(dto);
        if (!sucesso)
            return BadRequest(new { mensagem = erro });

        return Ok(dados);
    }

    // Apenas administradores podem cadastrar novos usuários.
    [HttpPost("registrar")]
    [Authorize(Roles = "Administrador")]
    public async Task<IActionResult> Registrar([FromBody] RegistrarUsuarioDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var (sucesso, erro, dados) = await _auth.RegistrarAsync(dto);
        if (!sucesso)
            return BadRequest(new { mensagem = erro });

        return Ok(dados);
    }

    // Retorna os dados do usuário autenticado (útil para o front validar o token)
    [HttpGet("eu")]
    [Authorize]
    public IActionResult Eu()
    {
        return Ok(new
        {
            usuario = User.Identity?.Name,
            papel = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value
        });
    }
}
