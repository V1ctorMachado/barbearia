using System.ComponentModel.DataAnnotations;

namespace BarbeariaApi.Models;

public class Servico
{
    public int Id { get; set; }

    [Required(ErrorMessage = "O nome do serviço é obrigatório")]
    [StringLength(100)]
    public string Nome { get; set; } = string.Empty;

    [StringLength(300)]
    public string? Descricao { get; set; }

    [Range(0.01, 10000, ErrorMessage = "O preço deve ser maior que zero")]
    public decimal Preco { get; set; }

    [Range(5, 480, ErrorMessage = "A duração deve estar entre 5 e 480 minutos")]
    public int DuracaoMinutos { get; set; }

    public bool Ativo { get; set; } = true;

    public ICollection<Agendamento> Agendamentos { get; set; } = new List<Agendamento>();
}
