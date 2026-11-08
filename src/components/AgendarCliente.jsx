import { useState } from 'react';
import { SERVICOS, BARBEIROS } from '../lib/dados';
import { horariosLivres, criarAgendamentoEquipe } from '../lib/agendamentos';
import { celularValido, formatarCelular, mascaraCelular } from '../lib/celular';
import { hojeISO } from '../lib/datas';

// ─────────────────────────────────────────────────────────────
//  AGENDAR CLIENTE (painel da equipe)
//  Para clientes de balcão ou WhatsApp, sem conta no site.
//  Mostra só horários livres (mesma regra da tela do cliente).
// ─────────────────────────────────────────────────────────────

const hora = (d) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const brl = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function AgendarCliente({ staffUid, onFechar, onAgendado }) {
  const barbeiroId = BARBEIROS[0].id;
  const [nome, setNome] = useState('');
  const [celular, setCelular] = useState('');
  const [servicoId, setServicoId] = useState(SERVICOS[0].id);
  const [data, setData] = useState(hojeISO());
  const [horarios, setHorarios] = useState([]);
  const [buscou, setBuscou] = useState(false);
  const [horarioSel, setHorarioSel] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const servico = SERVICOS.find((s) => s.id === servicoId);

  // Mudou serviço ou data: a lista de horários antiga não vale mais.
  function limpar() { setHorarios([]); setBuscou(false); setHorarioSel(null); }

  async function buscar() {
    if (!data) { setErro('Escolha a data.'); return; }
    setErro(''); setBuscando(true); setHorarioSel(null);
    try {
      setHorarios(await horariosLivres(barbeiroId, servicoId, data));
      setBuscou(true);
    } catch (e) {
      setErro(e?.code === 'TEMPO_ESGOTADO' ? 'O servidor demorou para responder. Tente de novo.' : 'Não foi possível carregar os horários.');
    } finally {
      setBuscando(false);
    }
  }

  async function salvar() {
    setErro('');
    if (!nome.trim()) { setErro('Informe o nome do cliente.'); return; }
    if (celular && !celularValido(celular)) { setErro('Celular incompleto. Use DDD + número, ou deixe em branco.'); return; }
    if (!horarioSel) { setErro('Escolha um horário.'); return; }
    setSalvando(true);
    try {
      await criarAgendamentoEquipe({
        clienteNome: nome.trim(),
        clienteTelefone: celular ? formatarCelular(celular) : '',
        barbeiroId, servicoId, dataHora: horarioSel, criadoPor: staffUid,
      });
      onAgendado?.();
    } catch (e) {
      if (e.message === 'HORARIO_OCUPADO') {
        setErro('Esse horário acabou de ser ocupado. Escolha outro.');
        buscar();
      } else if (e?.code === 'TEMPO_ESGOTADO') {
        setErro('O servidor demorou para responder. Confira na agenda se o horário entrou antes de tentar de novo.');
      } else {
        console.error('Erro ao agendar pela equipe:', e);
        setErro('Não foi possível agendar. Tente de novo.');
      }
      setSalvando(false);
    }
  }

  return (
    <div className="modal-fundo" onClick={(e) => e.target === e.currentTarget && onFechar()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="titulo-agendar">
        <div className="modal-topo">
          <h2 id="titulo-agendar">Agendar cliente</h2>
          <button className="modal-fechar" onClick={onFechar} aria-label="Fechar">×</button>
        </div>

        {erro && <div className="alerta">{erro}</div>}

        <div className="campo">
          <label>Nome do cliente</label>
          <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome" autoFocus />
        </div>
        <div className="campo">
          <label>Celular (opcional)</label>
          <input type="tel" inputMode="tel" value={celular} onChange={(e) => setCelular(mascaraCelular(e.target.value))}
                 placeholder="(27) 99999-8888" />
        </div>
        <div className="campo">
          <label>Serviço</label>
          <select value={servicoId} onChange={(e) => { setServicoId(e.target.value); limpar(); }}>
            {SERVICOS.map((s) => <option key={s.id} value={s.id}>{s.nome} — {brl(s.preco)} · {s.duracaoMin}min</option>)}
          </select>
        </div>
        <div className="campo">
          <label>Data</label>
          <div className="modal-linha">
            <input type="date" value={data} min={hojeISO()} onChange={(e) => { setData(e.target.value); limpar(); }} />
            <button className="btn-ghost" type="button" onClick={buscar} disabled={buscando}>
              {buscando ? 'Buscando…' : 'Ver horários'}
            </button>
          </div>
        </div>

        {buscou && (
          <div className="campo">
            <label>Horário</label>
            {horarios.length === 0 ? (
              <p className="modal-vazio">Nenhum horário livre nesta data para {servico?.nome}.</p>
            ) : (
              <div className="modal-horas">
                {horarios.map((h) => (
                  <button key={h.getTime()} type="button"
                          className={`modal-hora${horarioSel?.getTime() === h.getTime() ? ' sel' : ''}`}
                          onClick={() => setHorarioSel(h)}>
                    {hora(h)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {horarioSel && (
          <p className="modal-resumo">
            <strong>{nome.trim() || 'Cliente'}</strong> · {servico?.nome} · {brl(servico?.preco || 0)}<br />
            {horarioSel.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })} às {hora(horarioSel)}
          </p>
        )}

        <div className="modal-acoes">
          <button className="btn-ghost" type="button" onClick={onFechar}>Cancelar</button>
          <button className="btn" type="button" onClick={salvar} disabled={salvando || !horarioSel}>
            {salvando ? 'Agendando…' : 'Confirmar agendamento'}
          </button>
        </div>
      </div>
    </div>
  );
}
