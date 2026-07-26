using System.ComponentModel.DataAnnotations;

namespace BarbeariaApi.Models;

public enum PapelUsuario
{
    Atendente = 0,
    Administrador = 1
}

public class Usuario
{
    public int Id { get; set; }

    [Required]
    [StringLength(100)]
    public string Nome { get; set; } = string.Empty;

    [Required]
    [StringLength(100)]
    public string Usuario_ { get; set; } = string.Empty; // login (username)

    // Guardamos apenas o hash + salt, nunca a senha em texto puro
    [Required]
    public byte[] SenhaHash { get; set; } = Array.Empty<byte>();

    [Required]
    public byte[] SenhaSalt { get; set; } = Array.Empty<byte>();

    public PapelUsuario Papel { get; set; } = PapelUsuario.Atendente;

    public bool Ativo { get; set; } = true;

    public DateTime DataCadastro { get; set; } = DateTime.UtcNow;
}
