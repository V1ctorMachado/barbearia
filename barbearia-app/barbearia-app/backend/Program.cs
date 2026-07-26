using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using BarbeariaApi.Data;
using BarbeariaApi.Models;
using BarbeariaApi.Services;

var builder = WebApplication.CreateBuilder(args);

// Banco de dados. Por padrão usa SQLite (zero configuração para rodar localmente).
// Para SQL Server, troque por UseSqlServer e ajuste a connection string no appsettings.
builder.Services.AddDbContext<BarbeariaContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")
                      ?? "Data Source=barbearia.db"));

builder.Services.AddScoped<AgendamentoService>();
builder.Services.AddScoped<AuthService>();

// ── Autenticação JWT ─────────────────────────────────────
var jwtChave = builder.Configuration["Jwt:Chave"]
    ?? throw new InvalidOperationException("Configure Jwt:Chave no appsettings.json");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Emissor"],
            ValidAudience = builder.Configuration["Jwt:Audiencia"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtChave)),
            ClockSkew = TimeSpan.Zero // token expira na hora exata, sem tolerância extra
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    // Habilita o botão "Authorize" no Swagger para testar endpoints protegidos
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "Cole o token JWT assim: Bearer {seu token}",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

// CORS para permitir o Angular (rodando em localhost:4200) consumir a API
const string CorsPolicy = "PermitirAngular";
builder.Services.AddCors(options =>
{
    options.AddPolicy(CorsPolicy, policy =>
        policy.WithOrigins("http://localhost:4200")
              .AllowAnyHeader()
              .AllowAnyMethod());
});

var app = builder.Build();

// Cria/atualiza o banco automaticamente na inicialização
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<BarbeariaContext>();
    context.Database.EnsureCreated();

    // Cria um administrador padrão na primeira execução, se não houver nenhum usuário.
    // Senha gerada com hash aqui (não no seed do EF) porque o salt é aleatório.
    if (!context.Usuarios.Any())
    {
        var auth = scope.ServiceProvider.GetRequiredService<AuthService>();
        auth.RegistrarAsync(new BarbeariaApi.DTOs.RegistrarUsuarioDto
        {
            Nome = "Administrador",
            Usuario = "admin",
            Senha = "admin123", // TROQUE após o primeiro login!
            Papel = PapelUsuario.Administrador
        }).GetAwaiter().GetResult();

        app.Logger.LogWarning("Usuário admin criado com senha padrão 'admin123'. Altere-a assim que possível.");
    }
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors(CorsPolicy);
app.UseAuthentication(); // valida o token — deve vir ANTES de UseAuthorization
app.UseAuthorization();
app.MapControllers();

app.Run();
