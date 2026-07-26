import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Barbeiro, Servico, Cliente, Agendamento, CriarAgendamento, StatusAgendamento
} from '../models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly baseUrl = 'http://localhost:5000/api';

  constructor(private http: HttpClient) {}

  // Barbeiros
  getBarbeiros(): Observable<Barbeiro[]> {
    return this.http.get<Barbeiro[]>(`${this.baseUrl}/barbeiros`);
  }

  // Serviços
  getServicos(): Observable<Servico[]> {
    return this.http.get<Servico[]>(`${this.baseUrl}/servicos`);
  }

  // Clientes
  getClientes(busca?: string): Observable<Cliente[]> {
    let params = new HttpParams();
    if (busca) params = params.set('busca', busca);
    return this.http.get<Cliente[]>(`${this.baseUrl}/clientes`, { params });
  }

  criarCliente(cliente: Partial<Cliente>): Observable<Cliente> {
    return this.http.post<Cliente>(`${this.baseUrl}/clientes`, cliente);
  }

  // Agendamentos
  getAgendamentos(data?: string, barbeiroId?: number): Observable<Agendamento[]> {
    let params = new HttpParams();
    if (data) params = params.set('data', data);
    if (barbeiroId) params = params.set('barbeiroId', barbeiroId.toString());
    return this.http.get<Agendamento[]>(`${this.baseUrl}/agendamentos`, { params });
  }

  criarAgendamento(dados: CriarAgendamento): Observable<Agendamento> {
    return this.http.post<Agendamento>(`${this.baseUrl}/agendamentos`, dados);
  }

  atualizarStatus(id: number, status: StatusAgendamento): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/agendamentos/${id}/status`, { status });
  }
}
