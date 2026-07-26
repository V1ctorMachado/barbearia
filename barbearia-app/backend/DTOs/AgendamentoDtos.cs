using System.ComponentModel.DataAnnotations;
using BarbeariaApi.Models;

namespace BarbeariaApi.DTOs;

// O que o cliente envia para criar um agendamento
public class CriarAgendamentoDto
{
    [Required]
    public DateTime DataHora { get; set; }

    [Required]
    public int ClienteId { get; set; }

    [Required]
    public int BarbeiroId { get; set; }

    [Required]
    public int ServicoId { get; set; }

    [StringLength(500)]
    public string? Observacoes { get; set; }
}

// O que a API devolve (já com dados relacionados resolvidos)
public class AgendamentoResponseDto
{
    public int Id { get; set; }
    public DateTime DataHora { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Observacoes { get; set; }
    public decimal PrecoCobrado { get; set; }

    public int ClienteId { get; set; }
    public string ClienteNome { get; set; } = string.Empty;
    public string ClienteTelefone { get; set; } = string.Empty;

    public int BarbeiroId { get; set; }
    public string BarbeiroNome { get; set; } = string.Empty;

    public int ServicoId { get; set; }
    public string ServicoNome { get; set; } = string.Empty;
    public int DuracaoMinutos { get; set; }
}

public class AtualizarStatusDto
{
    [Required]
    public StatusAgendamento Status { get; set; }
}
