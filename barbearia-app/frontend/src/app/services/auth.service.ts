import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface AuthResponse {
  token: string;
  expiraEm: string;
  usuarioId: number;
  nome: string;
  usuario: string;
  papel: string;
}

const CHAVE_STORAGE = 'barbearia_auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly baseUrl = 'http://localhost:5000/api/auth';

  // Estado reativo do usuário logado
  private sessao = signal<AuthResponse | null>(this.carregarSessao());

  usuarioLogado = computed(() => this.sessao());
  estaLogado = computed(() => {
    const s = this.sessao();
    if (!s) return false;
    // Considera expirado se passou da validade
    return new Date(s.expiraEm) > new Date();
  });
  ehAdmin = computed(() => this.sessao()?.papel === 'Administrador');

  constructor(private http: HttpClient) {}

  login(usuario: string, senha: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/login`, { usuario, senha }).pipe(
      tap(resp => this.salvarSessao(resp))
    );
  }

  logout(): void {
    localStorage.removeItem(CHAVE_STORAGE);
    this.sessao.set(null);
  }

  getToken(): string | null {
    const s = this.sessao();
    return s && this.estaLogado() ? s.token : null;
  }

  private salvarSessao(resp: AuthResponse): void {
    localStorage.setItem(CHAVE_STORAGE, JSON.stringify(resp));
    this.sessao.set(resp);
  }

  private carregarSessao(): AuthResponse | null {
    const bruto = localStorage.getItem(CHAVE_STORAGE);
    if (!bruto) return null;
    try {
      return JSON.parse(bruto) as AuthResponse;
    } catch {
      return null;
    }
  }
}
