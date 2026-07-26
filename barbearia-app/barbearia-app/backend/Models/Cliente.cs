using System.ComponentModel.DataAnnotations;

namespace BarbeariaApi.Models;

public class Cliente
{
    public int Id { get; set; }

    [Required(ErrorMessage = "O nome é obrigatório")]
    [StringLength(100)]
    public string Nome { get; set; } = string.Empty;

    [Required(ErrorMessage = "O telefone é obrigatório")]
    [StringLength(20)]
    public string Telefone { get; set; } = string.Empty;

    [EmailAddress(ErrorMessage = "E-mail inválido")]
    [StringLength(150)]
    public string? Email { get; set; }

    public DateTime DataCadastro { get; set; } = DateTime.UtcNow;

    public ICollection<Agendamento> Agendamentos { get; set; } = new List<Agendamento>();
}
