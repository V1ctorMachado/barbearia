using System.ComponentModel.DataAnnotations;
using BarbeariaApi.Models;

namespace BarbeariaApi.DTOs;

public class LoginDto
{
    [Required(ErrorMessage = "Informe o usuário")]
    public string Usuario { get; set; } = string.Empty;

    [Required(ErrorMessage = "Informe a senha")]
    public string Senha { get; set; } = string.Empty;
}

public class RegistrarUsuarioDto
{
    [Required]
    [StringLength(100)]
    public string Nome { get; set; } = string.Empty;

    [Required]
    [StringLength(100, MinimumLength = 3, ErrorMessage = "O usuário deve ter ao menos 3 caracteres")]
    public string Usuario { get; set; } = string.Empty;

    [Required]
    [StringLength(100, MinimumLength = 6, ErrorMessage = "A senha deve ter ao menos 6 caracteres")]
    public string Senha { get; set; } = string.Empty;

    public PapelUsuario Papel { get; set; } = PapelUsuario.Atendente;
}

public class AuthResponseDto
{
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiraEm { get; set; }
    public int UsuarioId { get; set; }
    public string Nome { get; set; } = string.Empty;
    public string Usuario { get; set; } = string.Empty;
    public string Papel { get; set; } = string.Empty;
}
