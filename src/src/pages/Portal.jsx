import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { SERVICOS, STATUS_LABEL, servicoPorId, abreNoDia } from '../lib/dados';
import { criarAgendamento, listarPorCliente, horariosLivres, atualizarStatus } from '../lib/agendamentos';
import { hojeISO, ehDataPassada } from '../lib/datas';
import { lerConfig, dataBloqueada } from '../lib/config';
import BotaoWhatsApp from '../components/BotaoWhatsApp';
import './Portal.css';

const hojeIso = hojeISO; // usa a versão à prova de fuso
const fmtHora = (d) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const fmtDataHora = (d) => d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const brl = (n) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Portal() {
  const { usuario, sair } = useAuth();
  const navigate = useNavigate();
  const [aba, setAba] = useState('agendar');
  const [clienteNome, setClienteNome] = useState('');
  const [bloqueios, setBloqueios] = useState([]);
  const [aviso, setAviso] = useState('');

  // Carrega as datas bloqueadas e o aviso do topo.
  useEffect(() => {
    lerConfig().then((cfg) => {
      setBloqueios(cfg.bloqueios || []);
      setAviso((cfg.aviso || '').trim());
    }).catch(() => {});
  }, []);

  // Carrega o nome do perfil do cliente (para gravar no agendamento).
  useEffect(() => {
    if (!usuario) return;
    getDoc(doc(db, 'clientes', usuario.uid))
      .then((snap) => { if (snap.exists()) setClienteNome(snap.data().nome || ''); })
      .catch(() => { /* sem perfil/nome — segue com email */ });
  }, [usuario]);

  // Fluxo de agendamento
  // Barbeiro único (Stevon) — gravado automaticamente, sem o cliente escolher.
  const barbeiroId = 'stevon';
  const [servicoId, setServicoId] = useState(null);
  const [data, setData] = useState(hojeIso());
  const [horarios, setHorarios] = useState([]);
  const [horarioSel, setHorarioSel] = useState(null);
  const [buscou, setBuscou] = useState(false);

  const [buscando, setBuscando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  // Meus agendamentos
  const [meus, setMeus] = useState([]);

  const servico = servicoPorId(servicoId);
  const podeBuscar = servicoId && data;

  async function sairApp() {
    await sair();
    navigate('/login');
  }

  async function buscarHorarios() {
    if (!podeBuscar) { setErro('Escolha o serviço e a data.'); return; }
    setBuscando(true); setErro(''); setHorarioSel(null); setHorarios([]); setBuscou(false);
    try {
      const livres = await horariosLivres(barbeiroId, servicoId, data);
      setHorarios(livres);
      setBuscou(true);
    } catch (e) {
      console.error('Erro ao buscar horários:', e); // fica no console, discreto
      setErro('Não foi possível buscar os horários. Tente de novo.');
    } finally {
      setBuscando(false);
    }
  }

  async function confirmar() {
    if (!horarioSel) { setErro('Escolha um horário.'); return; }
    setEnviando(true); setErro(''); setSucesso('');
    try {
      await criarAgendamento({
        clienteUid: usuario.uid,
        clienteEmail: usuario.email,
        clienteNome,
        barbeiroId,
        servicoId,
        dataHora: horarioSel,
      });
      setSucesso('Pedido enviado! Ele fica pendente até a barbearia confirmar.');
      setHorarios([]); setHorarioSel(null); setBuscou(false);
    } catch (e) {
      if (e?.message === 'HORARIO_OCUPADO') {
        // Alguém pegou esse horário primeiro. Avisa e atualiza a lista.
        setErro('Esse horário acabou de ser reservado por outra pessoa. Escolha outro, por favor.');
        setHorarioSel(null);
        buscarHorarios(); // recarrega para tirar o horário que ficou ocupado
      } else {
        console.error('Erro ao agendar:', e);
        setErro('Não foi possível agendar. Tente de novo.');
      }
    } finally {
      setEnviando(false);
    }
  }

  async function carregarMeus() {
    try {
      setMeus(await listarPorCliente(usuario.uid));
    } catch {
      setErro('Não foi possível carregar seus agendamentos.');
    }
  }

  useEffect(() => {
    if (aba === 'meus') carregarMeus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aba]);

  async function cancelar(id) {
    try {
      await atualizarStatus(id, 'cancelado');
      carregarMeus();
    } catch {
      setErro('Não foi possível cancelar.');
    }
  }

  const podeCancelar = (s) => ['pendente', 'agendado', 'confirmado'].includes(s);

  return (
    <div className="portal-shell">
      <header className="topbar topbar-logo">
        <div className="brand-logo">
          <img src="/logo.png" alt="Barbearia Mageschi" className="logo-img" />
          <span className="tagline">Agende seu horário</span>
        </div>
        <div className="usuario-box">
          <span className="usuario-nome">{usuario?.email}</span>
          <button className="btn-sair" onClick={sairApp}>Sair</button>
        </div>
      </header>

      {aviso && (
        <div className="faixa-aviso" role="status">{aviso}</div>
      )}

      <nav className="abas">
        <button className={aba === 'agendar' ? 'ativa' : ''} onClick={() => { setAba('agendar'); setErro(''); }}>
          Novo agendamento
        </button>
        <button className={aba === 'meus' ? 'ativa' : ''} onClick={() => { setAba('meus'); setErro(''); }}>
          Meus agendamentos
        </button>
      </nav>

      {aba === 'agendar' && (
        <main className="conteudo">
          {sucesso && <div className="aviso-ok">{sucesso}</div>}
          {erro && <div className="alerta">{erro}</div>}

          <div className="passo">
            <span className="passo-num">1</span>
            <div className="passo-corpo">
              <label>Escolha o serviço</label>
              <div className="opcoes">
                {SERVICOS.map((s) => (
                  <button key={s.id} className={`chip ${servicoId === s.id ? 'sel' : ''}`}
                          onClick={() => setServicoId(s.id)}>
                    {s.nome}<small>{brl(s.preco)} · {s.duracaoMin}min</small>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="passo">
            <span className="passo-num">2</span>
            <div className="passo-corpo">
              <label>Escolha a data</label>
              <div className="data-linha">
                <input type="date" value={data} min={hojeIso()} onChange={(e) => setData(e.target.value)} />
                <button className="btn-ghost" onClick={buscarHorarios} disabled={!podeBuscar || buscando}>
                  {buscando ? 'Buscando…' : 'Ver horários'}
                </button>
              </div>
            </div>
          </div>

          {buscou && (
            <div className="passo">
              <span className="passo-num">3</span>
              <div className="passo-corpo">
                <label>Horários disponíveis</label>
                {horarios.length > 0 ? (
                  <div className="horarios">
                    {horarios.map((h) => (
                      <button key={h.toISOString()}
                              className={`hora-chip ${horarioSel === h ? 'sel' : ''}`}
                              onClick={() => setHorarioSel(h)}>
                        {fmtHora(h)}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="vazio-inline">
                    {ehDataPassada(data)
                      ? 'Essa data já passou. Escolha uma data a partir de hoje.'
                      : dataBloqueada(data, bloqueios)
                        ? `Fechado nesta data${dataBloqueada(data, bloqueios).motivo ? ' (' + dataBloqueada(data, bloqueios).motivo + ')' : ''}. Escolha outra data.`
                        : abreNoDia(data)
                          ? 'Nenhum horário livre nessa data. Tente outro dia.'
                          : 'A barbearia não abre nesse dia (funciona de terça a sábado). Escolha outra data.'}
                  </p>
                )}
              </div>
            </div>
          )}

          {horarioSel && (
            <div className="confirmar-box">
              <div className="resumo">
                <strong>{servico?.nome}</strong> às {fmtHora(horarioSel)}
                <span className="resumo-preco">{brl(servico?.preco || 0)}</span>
              </div>
              <button className="btn btn-bloco" onClick={confirmar} disabled={enviando}>
                {enviando ? 'Enviando…' : 'Confirmar agendamento'}
              </button>
            </div>
          )}
        </main>
      )}

      {aba === 'meus' && (
        <main className="conteudo">
          {erro && <div className="alerta">{erro}</div>}
          {meus.length === 0 ? (
            <p className="vazio">Você ainda não tem agendamentos.</p>
          ) : (
            meus.map((ag) => (
              <article key={ag.id} className={`meu-card st-${ag.status}`}>
                <div className="faixa" />
                <div className="meu-info">
                  <span className="meu-data">{fmtDataHora(ag.dataHora)}</span>
                  <strong>{ag.servicoNome}</strong>
                </div>
                <div className="meu-lado">
                  <span className="meu-status">{STATUS_LABEL[ag.status]}</span>
                  <span className="meu-preco">{brl(ag.preco)}</span>
                  {podeCancelar(ag.status) && (
                    <button className="btn-cancelar" onClick={() => cancelar(ag.id)}>Cancelar</button>
                  )}
                </div>
              </article>
            ))
          )}
        </main>
      )}
      <BotaoWhatsApp mensagem="Olá! Vim pelo site de agendamento." />
    </div>
  );
}
