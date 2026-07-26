using System.ComponentModel.DataAnnotations;

namespace BarbeariaApi.Models;

public enum StatusAgendamento
{
    Agendado = 0,
    Confirmado = 1,
    Concluido = 2,
    Cancelado = 3
}

public class Agendamento
{
    public int Id { get; set; }

    [Required]
    public DateTime DataHora { get; set; }

    public StatusAgendamento Status { get; set; } = StatusAgendamento.Agendado;

    [StringLength(500)]
    public string? Observacoes { get; set; }

    // Chaves estrangeiras
    public int ClienteId { get; set; }
    public Cliente? Cliente { get; set; }

    public int BarbeiroId { get; set; }
    public Barbeiro? Barbeiro { get; set; }

    public int ServicoId { get; set; }
    public Servico? Servico { get; set; }

    // Preço "congelado" no momento do agendamento (caso o preço do serviço mude depois)
    public decimal PrecoCobrado { get; set; }
}
