using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using BarbeariaApi.Data;
using BarbeariaApi.DTOs;
using BarbeariaApi.Models;

namespace BarbeariaApi.Services;

public class AuthService
{
    private readonly BarbeariaContext _context;
    private readonly IConfiguration _config;

    public AuthService(BarbeariaContext context, IConfiguration config)
    {
        _context = context;
        _config = config;
    }

    public async Task<(bool Sucesso, string? Erro, AuthResponseDto? Dados)> LoginAsync(LoginDto dto)
    {
        var usuario = await _context.Usuarios
            .FirstOrDefaultAsync(u => u.Usuario_ == dto.Usuario);

        // Mesma mensagem para usuário inexistente ou senha errada:
        // não revelamos qual dos dois falhou (evita enumeração de usuários).
        if (usuario is null || !usuario.Ativo)
            return (false, "Usuário ou senha inválidos.", null);

        if (!VerificarSenha(dto.Senha, usuario.SenhaHash, usuario.SenhaSalt))
            return (false, "Usuário ou senha inválidos.", null);

        return (true, null, GerarResposta(usuario));
    }

    public async Task<(bool Sucesso, string? Erro, AuthResponseDto? Dados)> RegistrarAsync(RegistrarUsuarioDto dto)
    {
        var jaExiste = await _context.Usuarios.AnyAsync(u => u.Usuario_ == dto.Usuario);
        if (jaExiste)
            return (false, "Este nome de usuário já está em uso.", null);

        CriarHashSenha(dto.Senha, out var hash, out var salt);

        var usuario = new Usuario
        {
            Nome = dto.Nome,
            Usuario_ = dto.Usuario,
            SenhaHash = hash,
            SenhaSalt = salt,
            Papel = dto.Papel,
            Ativo = true
        };

        _context.Usuarios.Add(usuario);
        await _context.SaveChangesAsync();

        return (true, null, GerarResposta(usuario));
    }

    // Registro público: cria o Cliente e a conta de login juntos, vinculados.
    // Usado pela área pública, onde o próprio cliente se cadastra.
    public async Task<(bool Sucesso, string? Erro, AuthResponseDto? Dados)> RegistrarClienteAsync(RegistrarClienteDto dto)
    {
        var jaExiste = await _context.Usuarios.AnyAsync(u => u.Usuario_ == dto.Usuario);
        if (jaExiste)
            return (false, "Este nome de usuário já está em uso.", null);

        CriarHashSenha(dto.Senha, out var hash, out var salt);

        // Cria primeiro o registro de Cliente
        var cliente = new Cliente
        {
            Nome = dto.Nome,
            Telefone = dto.Telefone,
            Email = dto.Email
        };
        _context.Clientes.Add(cliente);
        await _context.SaveChangesAsync(); // gera o ClienteId

        // Cria a conta de login vinculada ao cliente, com papel Cliente
        var usuario = new Usuario
        {
            Nome = dto.Nome,
            Usuario_ = dto.Usuario,
            SenhaHash = hash,
            SenhaSalt = salt,
            Papel = PapelUsuario.Cliente,
            ClienteId = cliente.Id,
            Ativo = true
        };
        _context.Usuarios.Add(usuario);
        await _context.SaveChangesAsync();

        return (true, null, GerarResposta(usuario));
    }

    // ── Hash de senha ────────────────────────────────────
    // HMAC-SHA512 gera um salt aleatório por usuário. Duas senhas iguais
    // resultam em hashes diferentes, e o hash não é reversível.
    private static void CriarHashSenha(string senha, out byte[] hash, out byte[] salt)
    {
        using var hmac = new HMACSHA512();
        salt = hmac.Key;
        hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(senha));
    }

    private static bool VerificarSenha(string senha, byte[] hashArmazenado, byte[] salt)
    {
        using var hmac = new HMACSHA512(salt);
        var hashCalculado = hmac.ComputeHash(Encoding.UTF8.GetBytes(senha));
        // Comparação em tempo fixo evita ataques de timing
        return CryptographicOperations.FixedTimeEquals(hashCalculado, hashArmazenado);
    }

    // ── Geração do JWT ───────────────────────────────────
    private AuthResponseDto GerarResposta(Usuario usuario)
    {
        var chave = _config["Jwt:Chave"]
            ?? throw new InvalidOperationException("Jwt:Chave não configurada.");
        var horasValidade = int.TryParse(_config["Jwt:HorasValidade"], out var h) ? h : 8;
        var expiraEm = DateTime.UtcNow.AddHours(horasValidade);

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, usuario.Id.ToString()),
            new Claim(ClaimTypes.Name, usuario.Usuario_),
            new Claim(ClaimTypes.Role, usuario.Papel.ToString())
        };

        // Se for cliente, embute o ClienteId no token para o backend poder
        // garantir que ele só acesse os próprios dados.
        if (usuario.ClienteId.HasValue)
            claims.Add(new Claim("clienteId", usuario.ClienteId.Value.ToString()));

        var credenciais = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(chave)),
            SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Emissor"],
            audience: _config["Jwt:Audiencia"],
            claims: claims,
            expires: expiraEm,
            signingCredentials: credenciais);

        return new AuthResponseDto
        {
            Token = new JwtSecurityTokenHandler().WriteToken(token),
            ExpiraEm = expiraEm,
            UsuarioId = usuario.Id,
            Nome = usuario.Nome,
            Usuario = usuario.Usuario_,
            Papel = usuario.Papel.ToString(),
            ClienteId = usuario.ClienteId
        };
    }
}
