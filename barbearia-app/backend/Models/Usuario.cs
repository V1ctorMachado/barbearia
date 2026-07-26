using System.ComponentModel.DataAnnotations;

namespace BarbeariaApi.Models;

public enum PapelUsuario
{
    Cliente = 0,        // cliente final, agenda pela área pública
    Atendente = 1,
    Administrador = 2
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

    // Vínculo com o registro de Cliente (preenchido apenas quando Papel = Cliente).
    // Permite que a conta de login do cliente aponte para os dados que aparecem
    // nos agendamentos (nome, telefone).
    public int? ClienteId { get; set; }
    public Cliente? Cliente { get; set; }
}
