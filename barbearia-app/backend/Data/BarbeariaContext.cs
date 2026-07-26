using Microsoft.EntityFrameworkCore;
using BarbeariaApi.Models;

namespace BarbeariaApi.Data;

public class BarbeariaContext : DbContext
{
    public BarbeariaContext(DbContextOptions<BarbeariaContext> options) : base(options) { }

    public DbSet<Barbeiro> Barbeiros => Set<Barbeiro>();
    public DbSet<Servico> Servicos => Set<Servico>();
    public DbSet<Cliente> Clientes => Set<Cliente>();
    public DbSet<Agendamento> Agendamentos => Set<Agendamento>();
    public DbSet<Usuario> Usuarios => Set<Usuario>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Precisão decimal para preços
        modelBuilder.Entity<Servico>().Property(s => s.Preco).HasPrecision(10, 2);
        modelBuilder.Entity<Agendamento>().Property(a => a.PrecoCobrado).HasPrecision(10, 2);

        // Evita cascata de deleção que causa múltiplos caminhos no SQL Server
        modelBuilder.Entity<Agendamento>()
            .HasOne(a => a.Barbeiro)
            .WithMany(b => b.Agendamentos)
            .HasForeignKey(a => a.BarbeiroId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Agendamento>()
            .HasOne(a => a.Servico)
            .WithMany(s => s.Agendamentos)
            .HasForeignKey(a => a.ServicoId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Agendamento>()
            .HasOne(a => a.Cliente)
            .WithMany(c => c.Agendamentos)
            .HasForeignKey(a => a.ClienteId)
            .OnDelete(DeleteBehavior.Cascade);

        // Dados iniciais (seed)
        modelBuilder.Entity<Barbeiro>().HasData(
            new Barbeiro { Id = 1, Nome = "Ricardo Alves", Especialidades = "Corte clássico, Barba", Ativo = true },
            new Barbeiro { Id = 2, Nome = "Marcos Silva", Especialidades = "Degradê, Navalha", Ativo = true },
            new Barbeiro { Id = 3, Nome = "João Pereira", Especialidades = "Corte infantil, Sobrancelha", Ativo = true }
        );

        modelBuilder.Entity<Servico>().HasData(
            new Servico { Id = 1, Nome = "Corte Masculino", Descricao = "Corte de cabelo completo", Preco = 45.00m, DuracaoMinutos = 30, Ativo = true },
            new Servico { Id = 2, Nome = "Barba", Descricao = "Aparar e modelar a barba", Preco = 35.00m, DuracaoMinutos = 25, Ativo = true },
            new Servico { Id = 3, Nome = "Corte + Barba", Descricao = "Combo completo", Preco = 70.00m, DuracaoMinutos = 50, Ativo = true },
            new Servico { Id = 4, Nome = "Corte Infantil", Descricao = "Para crianças até 12 anos", Preco = 35.00m, DuracaoMinutos = 30, Ativo = true },
            new Servico { Id = 5, Nome = "Sobrancelha", Descricao = "Design de sobrancelha masculina", Preco = 20.00m, DuracaoMinutos = 15, Ativo = true }
        );
    }
}
