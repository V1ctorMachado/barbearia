import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Barbeiro, Servico, Agendamento } from '../models';

@Injectable({ providedIn: 'root' })
export class PortalService {
  private readonly baseUrl = 'http://localhost:5000/api/portal';

  constructor(private http: HttpClient) {}

  getBarbeiros(): Observable<Barbeiro[]> {
    return this.http.get<Barbeiro[]>(`${this.baseUrl}/barbeiros`);
  }

  getServicos(): Observable<Servico[]> {
    return this.http.get<Servico[]>(`${this.baseUrl}/servicos`);
  }

  // Devolve a lista de horários vagos (como strings ISO de data/hora)
  getHorariosLivres(barbeiroId: number, servicoId: number, data: string): Observable<string[]> {
    const params = new HttpParams()
      .set('barbeiroId', barbeiroId.toString())
      .set('servicoId', servicoId.toString())
      .set('data', data);
    return this.http.get<string[]>(`${this.baseUrl}/horarios-livres`, { params });
  }

  agendar(dados: {
    barbeiroId: number;
    servicoId: number;
    dataHora: string;
    observacoes?: string;
  }): Observable<Agendamento> {
    return this.http.post<Agendamento>(`${this.baseUrl}/agendar`, dados);
  }

  meusAgendamentos(): Observable<Agendamento[]> {
    return this.http.get<Agendamento[]>(`${this.baseUrl}/meus-agendamentos`);
  }

  cancelar(id: number): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/cancelar/${id}`, {});
  }
}
