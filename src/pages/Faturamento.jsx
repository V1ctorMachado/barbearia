import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { listarPeriodo } from '../lib/agendamentos';
// CSS carregado globalmente em App.jsx

// ─────────────────────────────────────────────────────────────
//  FATURAMENTO — visão do mês ou do ano.
//  • Faturado   = atendimentos CONCLUÍDOS (✓✓ no painel).
//  • A receber  = pendentes, agendados e confirmados (ainda não concluídos).
//  • Cancelados = cancelados + recusados (não somam nada).
// ─────────────────────────────────────────────────────────────

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MESES_LONGOS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho',
  'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const ATIVOS = ['pendente', 'agendado', 'confirmado'];
const brl = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function mesAtualISO() {
  const h = new Date();
  return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}`;
}

export default function Faturamento() {
  const { usuario, sair } = useAuth();
  const navigate = useNavigate();
  const hoje = new Date();

  const [modo, setModo] = useState('mes');            // 'mes' | 'ano'
  const [mes, setMes] = useState(mesAtualISO());       // "YYYY-MM"
  const [ano, setAno] = useState(hoje.getFullYear());
  const [ags, setAgs] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [foco, setFoco] = useState(null);              // índice da barra em destaque

  // Período consultado
  const { inicio, fim, titulo } = useMemo(() => {
    if (modo === 'mes') {
      const [a, m] = mes.split('-').map(Number);
      return { inicio: new Date(a, m - 1, 1), fim: new Date(a, m, 1), titulo: `${MESES_LONGOS[m - 1]} de ${a}` };
    }
    return { inicio: new Date(ano, 0, 1), fim: new Date(ano + 1, 0, 1), titulo: String(ano) };
  }, [modo, mes, ano]);

  useEffect(() => {
    let ativo = true;
    setCarregando(true); setErro(''); setFoco(null);
    listarPeriodo(inicio, fim)
      .then((lista) => { if (ativo) setAgs(lista); })
      .catch((e) => {
        console.error('Erro ao carregar faturamento:', e);
        if (ativo) setErro(e?.code === 'TEMPO_ESGOTADO'
          ? 'O servidor demorou para responder. Verifique a internet e tente de novo.'
          : 'Não foi possível carregar o faturamento.');
      })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, [inicio, fim]);

  // Totais e agrupamentos
  const r = useMemo(() => {
    const concluidos = ags.filter((a) => a.status === 'concluido');
    const aReceber = ags.filter((a) => ATIVOS.includes(a.status));
    const cancelados = ags.filter((a) => ['cancelado', 'recusado'].includes(a.status));
    const soma = (l) => l.reduce((t, a) => t + (Number(a.preco) || 0), 0);

    // Barras: um por dia (mês) ou por mês (ano)
    const n = modo === 'mes' ? new Date(inicio.getFullYear(), inicio.getMonth() + 1, 0).getDate() : 12;
    const barras = Array.from({ length: n }, (_, i) => ({
      rotulo: modo === 'mes' ? String(i + 1) : MESES[i],
      completo: modo === 'mes'
        ? `${String(i + 1).padStart(2, '0')}/${String(inicio.getMonth() + 1).padStart(2, '0')}`
        : `${MESES_LONGOS[i]} de ${inicio.getFullYear()}`,
      faturado: 0, atendimentos: 0, aReceber: 0,
    }));
    const idx = (a) => (modo === 'mes' ? a.dataHora.getDate() - 1 : a.dataHora.getMonth());
    concluidos.forEach((a) => { const b = barras[idx(a)]; b.faturado += Number(a.preco) || 0; b.atendimentos += 1; });
    aReceber.forEach((a) => { barras[idx(a)].aReceber += Number(a.preco) || 0; });

    // Por serviço (concluídos)
    const mapa = {};
    concluidos.forEach((a) => {
      const k = a.servicoNome || 'Outro';
      mapa[k] = mapa[k] || { nome: k, qtd: 0, total: 0 };
      mapa[k].qtd += 1; mapa[k].total += Number(a.preco) || 0;
    });
    const servicos = Object.values(mapa).sort((x, y) => y.total - x.total);

    const faturado = soma(concluidos);
    return {
      faturado, qtd: concluidos.length,
      ticket: concluidos.length ? faturado / concluidos.length : 0,
      aReceber: soma(aReceber), qtdAReceber: aReceber.length,
      aReceberPassados: aReceber.filter((a) => a.dataHora < new Date()).length,
      cancelados: cancelados.length,
      barras, servicos,
      max: Math.max(1, ...barras.map((b) => b.faturado)),
    };
  }, [ags, modo, inicio]);

  async function sairApp() { await sair(); navigate('/staff'); }

  const destaque = foco != null ? r.barras[foco] : null;

  return (
    <div className="pagina">
      <header className="topbar topbar-logo">
        <div className="brand-logo">
          <img src="/logo.png" alt="Barbearia Mageschi" className="logo-img" />
          <span className="tagline">Faturamento</span>
        </div>
        <div className="usuario-box">
          <span className="usuario-nome">{usuario?.email}</span>
          <button className="btn-sair" onClick={sairApp}>Sair</button>
        </div>
      </header>

      <nav className="config-nav">
        <Link to="/painel" className="btn-voltar">← Voltar ao painel</Link>
      </nav>

      <main className="fat-conteudo">
        {/* Filtros — uma linha acima de tudo */}
        <div className="fat-filtros">
          <div className="fat-toggle" role="tablist" aria-label="Período">
            <button role="tab" aria-selected={modo === 'mes'} className={modo === 'mes' ? 'ativo' : ''} onClick={() => setModo('mes')}>Mês</button>
            <button role="tab" aria-selected={modo === 'ano'} className={modo === 'ano' ? 'ativo' : ''} onClick={() => setModo('ano')}>Ano</button>
          </div>
          {modo === 'mes' ? (
            <input type="month" value={mes} max={mesAtualISO().replace(/^(\d+)/, (y) => String(Number(y) + 1))}
                   onChange={(e) => e.target.value && setMes(e.target.value)} aria-label="Mês" />
          ) : (
            <select value={ano} onChange={(e) => setAno(Number(e.target.value))} aria-label="Ano">
              {Array.from({ length: 5 }, (_, i) => hoje.getFullYear() + 1 - i).map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          )}
        </div>

        {erro && <div className="alerta">{erro}</div>}

        {carregando ? (
          <p className="carregando">Carregando…</p>
        ) : !erro && (
          <>
            {/* Números principais */}
            <section className="fat-tiles">
              <div className="fat-tile principal">
                <span className="fat-rotulo">Faturado em {titulo}</span>
                <strong className="fat-valor">{brl(r.faturado)}</strong>
                <span className="fat-sub">{r.qtd} {r.qtd === 1 ? 'atendimento concluído' : 'atendimentos concluídos'}</span>
              </div>
              <div className="fat-tile">
                <span className="fat-rotulo">Ticket médio</span>
                <strong className="fat-valor">{brl(r.ticket)}</strong>
                <span className="fat-sub">por atendimento</span>
              </div>
              <div className="fat-tile">
                <span className="fat-rotulo">A receber</span>
                <strong className="fat-valor">{brl(r.aReceber)}</strong>
                <span className="fat-sub">{r.qtdAReceber} ainda não concluído{r.qtdAReceber === 1 ? '' : 's'}</span>
              </div>
              <div className="fat-tile">
                <span className="fat-rotulo">Cancelados / recusados</span>
                <strong className="fat-valor">{r.cancelados}</strong>
                <span className="fat-sub">não entram no faturamento</span>
              </div>
            </section>

            {r.aReceberPassados > 0 && (
              <p className="fat-aviso">
                ⚠ {r.aReceberPassados === 1
                  ? '1 atendimento já passou e não foi marcado como concluído.'
                  : `${r.aReceberPassados} atendimentos já passaram e não foram marcados como concluídos.`}
                {' '}Marque ✓✓ no painel para entrar no faturado.
              </p>
            )}

            {/* Gráfico: faturado por dia / por mês */}
            <section className="fat-grafico" aria-label={`Faturado por ${modo === 'mes' ? 'dia' : 'mês'}`}>
              <div className="fat-grafico-topo">
                <h2>Faturado por {modo === 'mes' ? 'dia' : 'mês'}</h2>
                <span className="fat-destaque" aria-live="polite">
                  {destaque
                    ? <>{destaque.completo}: <strong>{brl(destaque.faturado)}</strong> · {destaque.atendimentos} atend.
                        {destaque.aReceber > 0 && <> · a receber {brl(destaque.aReceber)}</>}</>
                    : 'Toque ou passe o mouse numa barra'}
                </span>
              </div>
              <div className="fat-barras" style={{ '--n': r.barras.length }} onMouseLeave={() => setFoco(null)}>
                {r.barras.map((b, i) => (
                  <button key={i} type="button"
                          className={`fat-coluna${foco === i ? ' foco' : ''}`}
                          onMouseEnter={() => setFoco(i)} onFocus={() => setFoco(i)} onClick={() => setFoco(i)}
                          aria-label={`${b.completo}: ${brl(b.faturado)}, ${b.atendimentos} atendimentos`}>
                    <span className="fat-barra" style={{ height: b.faturado ? `${Math.max(2, (b.faturado / r.max) * 100)}%` : 0 }} />
                    <span className="fat-eixo">{modo === 'mes' ? ((i + 1) % 5 === 0 || i === 0 ? b.rotulo : '') : b.rotulo}</span>
                  </button>
                ))}
              </div>
              <p className="fat-maximo">Maior {modo === 'mes' ? 'dia' : 'mês'}: {brl(r.max === 1 && r.faturado === 0 ? 0 : r.max)}</p>
            </section>

            {/* Por serviço */}
            <section className="fat-servicos">
              <h2>Por serviço</h2>
              {r.servicos.length === 0 ? (
                <p className="vazio">Nenhum atendimento concluído neste período.</p>
              ) : (
                <table>
                  <thead><tr><th>Serviço</th><th>Qtd</th><th>Total</th><th>%</th></tr></thead>
                  <tbody>
                    {r.servicos.map((s) => (
                      <tr key={s.nome}>
                        <td>{s.nome}</td><td>{s.qtd}</td><td>{brl(s.total)}</td>
                        <td>{Math.round((s.total / r.faturado) * 100)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            {/* Mesmos dados do gráfico, em tabela */}
            <details className="fat-tabela">
              <summary>Ver {modo === 'mes' ? 'dia a dia' : 'mês a mês'} em tabela</summary>
              <table>
                <thead><tr><th>{modo === 'mes' ? 'Dia' : 'Mês'}</th><th>Faturado</th><th>Atend.</th><th>A receber</th></tr></thead>
                <tbody>
                  {r.barras.filter((b) => b.faturado || b.aReceber).map((b) => (
                    <tr key={b.completo}><td>{b.completo}</td><td>{brl(b.faturado)}</td><td>{b.atendimentos}</td><td>{brl(b.aReceber)}</td></tr>
                  ))}
                </tbody>
              </table>
            </details>

            <p className="fat-nota">Faturado conta só os atendimentos marcados como <strong>Concluído (✓✓)</strong> no painel.</p>
          </>
        )}
      </main>
    </div>
  );
}
