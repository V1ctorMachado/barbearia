using System.ComponentModel.DataAnnotations;

namespace BarbeariaApi.Models;

public class Barbeiro
{
    public int Id { get; set; }

    [Required(ErrorMessage = "O nome é obrigatório")]
    [StringLength(100)]
    public string Nome { get; set; } = string.Empty;

    [StringLength(500)]
    public string? Especialidades { get; set; }

    [StringLength(300)]
    public string? FotoUrl { get; set; }

    public bool Ativo { get; set; } = true;

    // Relacionamento: um barbeiro tem muitos agendamentos
    public ICollection<Agendamento> Agendamentos { get; set; } = new List<Agendamento>();
}
