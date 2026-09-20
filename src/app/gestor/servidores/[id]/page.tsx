"use client";

import { useState, useEffect, FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { Card, Campo } from "@/components/Card";
import { Modal } from "@/components/Modal";
import { formatarData, formatarCPF, formatarMoeda, calcularTempoServico, situacaoCor } from "@/lib/format";

type Servidor = any;
type Vantagem = any;
type Historico = any;
type Afastamento = any;
type TipoVantagem = { id: number; codigo: string; nome: string; baseCalculo: string | null };

export default function GestorServidorDetail() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [sessao, setSessao] = useState<any>(null);
  const [servidor, setServidor] = useState<Servidor | null>(null);
  const [vantagens, setVantagens] = useState<Vantagem[]>([]);
  const [historico, setHistorico] = useState<Historico[]>([]);
  const [afastamentos, setAfastamentos] = useState<Afastamento[]>([]);
  const [tipos, setTipos] = useState<TipoVantagem[]>([]);
  const [aba, setAba] = useState<"vantagens" | "historico" | "afastamentos">("vantagens");

  // Modais
  const [modalVantagem, setModalVantagem] = useState(false);
  const [formVantagem, setFormVantagem] = useState<any>({});
  const [modalHist, setModalHist] = useState(false);
  const [formHist, setFormHist] = useState<any>({});
  const [modalAfast, setModalAfast] = useState(false);
  const [formAfast, setFormAfast] = useState<any>({});

  useEffect(() => {
    async function carregar() {
      try {
        const res = await fetch("/api/auth");
        const auth = await res.json();
        if (!auth.logado || auth.papel !== "gestor") {
          router.replace("/login?papel=gestor");
          return;
        }
        setSessao(auth);

      const [s, v, h, t] = await Promise.all([
        fetch(`/api/servidores?id=${id}`).then((r) => r.json()),
        fetch(`/api/vantagens?servidorId=${id}`).then((r) => r.json()),
        fetch(`/api/historico?servidorId=${id}`).then((r) => r.json()),
        fetch(`/api/vantagens?catalogo=1`).then((r) => r.json()),
      ]);
      setServidor(s);
      setVantagens(v);
      setHistorico(h.historico || []);
      setAfastamentos(h.afastamentos || []);
      setTipos(t);
      } catch (err) {
        router.replace("/gestor");
      }
    }
    carregar();
  }, [id, router]);

  async function recarregarVantagens() {
    const v = await (await fetch(`/api/vantagens?servidorId=${id}`)).json();
    setVantagens(v);
  }
  async function recarregarHistorico() {
    const h = await (await fetch(`/api/historico?servidorId=${id}`)).json();
    setHistorico(h.historico || []);
    setAfastamentos(h.afastamentos || []);
  }

  // ===== Vantagens =====
  function abrirNovaVantagem() {
    setFormVantagem({
      servidorId: Number(id),
      tipoVantagemId: tipos[0]?.id || 0,
      percentual: "",
      valorFixo: "",
      dataInicio: "",
      dataFim: "",
      fundamentoLegal: "",
      observacao: "",
    });
    setModalVantagem(true);
  }

  async function salvarVantagem(e: FormEvent) {
    e.preventDefault();
    await fetch("/api/vantagens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...formVantagem,
        percentual: formVantagem.percentual || null,
        valorFixo: formVantagem.valorFixo || null,
        dataFim: formVantagem.dataFim || null,
      }),
    });
    setModalVantagem(false);
    recarregarVantagens();
  }

  async function excluirVantagem(vid: number) {
    if (!confirm("Remover esta vantagem do servidor?")) return;
    await fetch(`/api/vantagens?id=${vid}`, { method: "DELETE" });
    recarregarVantagens();
  }

  // ===== Histórico =====
  function abrirNovoHist() {
    setFormHist({ servidorId: Number(id), dataOcorrencia: "", tipoEvento: "", descricao: "", atoLegal: "" });
    setModalHist(true);
  }
  async function salvarHist(e: FormEvent) {
    e.preventDefault();
    await fetch("/api/historico?tipo=historico", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formHist),
    });
    setModalHist(false);
    recarregarHistorico();
  }
  async function excluirHist(hid: number) {
    if (!confirm("Excluir este evento do histórico?")) return;
    await fetch(`/api/historico?id=${hid}&tipo=historico`, { method: "DELETE" });
    recarregarHistorico();
  }

  // ===== Afastamentos =====
  function abrirNovoAfast() {
    setFormAfast({ servidorId: Number(id), tipo: "", dataInicio: "", dataFim: "", dias: "", motivo: "" });
    setModalAfast(true);
  }
  async function salvarAfast(e: FormEvent) {
    e.preventDefault();
    await fetch("/api/historico?tipo=afastamento", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...formAfast, dias: formAfast.dias ? Number(formAfast.dias) : null }),
    });
    setModalAfast(false);
    recarregarHistorico();
  }
  async function excluirAfast(aid: number) {
    if (!confirm("Excluir este afastamento?")) return;
    await fetch(`/api/historico?id=${aid}&tipo=afastamento`, { method: "DELETE" });
    recarregarHistorico();
  }

  if (!servidor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-slate-700 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const somaPercentual = vantagens
    .filter((v: Vantagem) => v.tipoBaseCalculo === "percentual" && v.percentual)
    .reduce((acc: number, v: Vantagem) => acc + parseFloat(v.percentual || "0"), 0);

  return (
    <div className="min-h-screen bg-slate-50 print-container">
      <Header nome={sessao?.nome || ""} papel="gestor" voltarPara="/gestor" />

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Cabeçalho do servidor */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 md:p-8 text-white shadow-lg mb-6 print-shadow-none">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur text-white flex items-center justify-center text-2xl font-bold shrink-0">
                {servidor.nomeCompleto.charAt(0)}
              </div>
              <div>
                <h1 className="text-xl md:text-3xl font-bold">{servidor.nomeCompleto}</h1>
                <p className="text-slate-300 mt-1">{servidor.cargo} {servidor.funcao && `· ${servidor.funcao}`}</p>
                <div className="flex items-center gap-3 mt-2 flex-wrap text-sm">
                  <span className="font-mono bg-white/10 px-2 py-0.5 rounded">{servidor.matricula}</span>
                  <span>{formatarCPF(servidor.cpf)}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ring-1 ${situacaoCor(servidor.situacao)}`}>
                    {servidor.situacao}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2 no-print">
              <Link
                href={`/gestor`}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition"
              >
                ← Voltar à lista
              </Link>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold transition"
              >
                🖨️ Imprimir
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
          <StatBox label="Tempo de Serviço" valor={calcularTempoServico(servidor.dataAdmissao)} />
          <StatBox label="Vantagens Ativas" valor={vantagens.filter((v: Vantagem) => !v.dataFim).length} />
          <StatBox label="Total em %" valor={`${formatarMoeda(somaPercentual)}%`} />
          <StatBox label="Afastamentos" valor={afastamentos.length} />
        </div>

        {/* Dados funcionais */}
        <Card titulo="💼 Dados Funcionais" className="mb-6">
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
            <Campo label="Lotação">{servidor.lotacao}</Campo>
            <Campo label="Unidade de Exercício">{servidor.unidadeExercicio}</Campo>
            <Campo label="Regime Jurídico">{servidor.regimeJuridico}</Campo>
            <Campo label="Escolaridade">{servidor.escolaridade}</Campo>
            <Campo label="Categoria">{servidor.categoria}</Campo>
            <Campo label="Faixa">{servidor.faixa}</Campo>
            <Campo label="Nível">{servidor.nivel}</Campo>
            <Campo label="Jornada">{servidor.jornada}</Campo>
            <Campo label="Carga Horária">{servidor.cargaHoraria ? `${servidor.cargaHoraria}h semanais` : "—"}</Campo>
            <Campo label="Data de Admissão">{formatarData(servidor.dataAdmissao)}</Campo>
            <Campo label="Data de Posse">{formatarData(servidor.dataPosse)}</Campo>
            <Campo label="Data de Exercício">{formatarData(servidor.dataExercicio)}</Campo>
            <Campo label="Ingresso CTD">{formatarData(servidor.dtingCtd)}</Campo>
            <Campo label="Fim CTD">{formatarData(servidor.dtfimCtd)}</Campo>
          </dl>
        </Card>

        {/* Abas */}
        <div className="no-print p-1 bg-white rounded-xl border border-slate-200 inline-flex gap-1 mb-4">
          {([
            ["vantagens", `✨ Vantagens (${vantagens.length})`],
            ["historico", `📜 Histórico (${historico.length})`],
            ["afastamentos", `🏥 Afastamentos (${afastamentos.length})`],
          ] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setAba(k)}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${
                aba === k ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {aba === "vantagens" && (
          <Card
            titulo="Vantagens Adquiridas"
            acao={
              <button onClick={abrirNovaVantagem} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold transition">
                + Adicionar Vantagem
              </button>
            }
          >
            {vantagens.length === 0 ? (
              <p className="text-slate-500 text-sm">Nenhuma vantagem atribuída.</p>
            ) : (
              <div className="overflow-x-auto -mx-5 md:-mx-6">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-100">
                    <tr>
                      <th className="px-5 md:px-6 py-2">Vantagem</th>
                      <th className="px-3 py-2">Valor</th>
                      <th className="px-3 py-2">Início</th>
                      <th className="px-3 py-2">Fim</th>
                      <th className="px-3 py-2">Fundamento</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vantagens.map((v: Vantagem) => (
                      <tr key={v.id} className="hover:bg-slate-50">
                        <td className="px-5 md:px-6 py-3">
                          <div className="font-semibold text-slate-900">{v.tipoNome}</div>
                          <div className="text-xs text-slate-500">{v.tipoCodigo}</div>
                        </td>
                        <td className="px-3 py-3 font-semibold text-sky-700">
                          {v.tipoBaseCalculo === "percentual" ? `${formatarMoeda(v.percentual)}%` : v.valorFixo ? `R$ ${formatarMoeda(v.valorFixo)}` : "—"}
                        </td>
                        <td className="px-3 py-3 text-slate-600">{formatarData(v.dataInicio)}</td>
                        <td className="px-3 py-3 text-slate-600">{v.dataFim ? formatarData(v.dataFim) : "—"}</td>
                        <td className="px-3 py-3 text-slate-600 text-xs">{v.fundamentoLegal || "—"}</td>
                        <td className="px-3 py-3 text-right no-print">
                          <button onClick={() => excluirVantagem(v.id)} className="p-2 rounded-lg hover:bg-rose-50 hover:text-rose-700 text-slate-500 transition">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {aba === "historico" && (
          <Card
            titulo="Histórico Funcional"
            acao={
              <button onClick={abrirNovoHist} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold transition">
                + Adicionar Evento
              </button>
            }
          >
            {historico.length === 0 ? (
              <p className="text-slate-500 text-sm">Nenhum evento registrado.</p>
            ) : (
              <ol className="relative border-l-2 border-sky-200 ml-3 space-y-5">
                {historico.map((h: Historico) => (
                  <li key={h.id} className="pl-6 group">
                    <span className="absolute -left-[9px] w-4 h-4 bg-sky-600 rounded-full ring-4 ring-sky-100"></span>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded">
                          {formatarData(h.dataOcorrencia)}
                        </span>
                        <span className="font-bold text-slate-900 text-sm">{h.tipoEvento}</span>
                      </div>
                      <button onClick={() => excluirHist(h.id)} className="no-print opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-rose-50 hover:text-rose-700 text-slate-400 transition">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                        </svg>
                      </button>
                    </div>
                    <p className="text-sm text-slate-700 mt-1">{h.descricao}</p>
                    {h.atoLegal && <p className="text-xs text-slate-500 mt-1">📄 {h.atoLegal}</p>}
                  </li>
                ))}
              </ol>
            )}
          </Card>
        )}

        {aba === "afastamentos" && (
          <Card
            titulo="Afastamentos"
            acao={
              <button onClick={abrirNovoAfast} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold transition">
                + Registrar Afastamento
              </button>
            }
          >
            {afastamentos.length === 0 ? (
              <p className="text-slate-500 text-sm">Nenhum afastamento registrado.</p>
            ) : (
              <div className="space-y-3">
                {afastamentos.map((a: Afastamento) => (
                  <div key={a.id} className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 last:border-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900">{a.tipo}</span>
                        {a.dias && <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">{a.dias} dias</span>}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {formatarData(a.dataInicio)} {a.dataFim ? `→ ${formatarData(a.dataFim)}` : "(em andamento)"}
                      </p>
                      {a.motivo && <p className="text-xs text-slate-600 mt-1">{a.motivo}</p>}
                    </div>
                    <button onClick={() => excluirAfast(a.id)} className="no-print p-2 rounded-lg hover:bg-rose-50 hover:text-rose-700 text-slate-400 transition">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                        <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </main>

      {/* Modal Vantagem */}
      <Modal aberto={modalVantagem} onClose={() => setModalVantagem(false)} titulo="Adicionar Vantagem" largura="max-w-2xl">
        <form onSubmit={salvarVantagem} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tipo de Vantagem *</label>
            <select
              value={formVantagem.tipoVantagemId || ""}
              required
              onChange={(e) => setFormVantagem({ ...formVantagem, tipoVantagemId: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none text-sm"
            >
              <option value="">Selecione...</option>
              {tipos.map((t) => (
                <option key={t.id} value={t.id}>{t.codigo} - {t.nome}</option>
              ))}
            </select>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Percentual (%)</label>
              <input
                type="number"
                step="0.01"
                value={formVantagem.percentual || ""}
                onChange={(e) => setFormVantagem({ ...formVantagem, percentual: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Valor Fixo (R$)</label>
              <input
                type="number"
                step="0.01"
                value={formVantagem.valorFixo || ""}
                onChange={(e) => setFormVantagem({ ...formVantagem, valorFixo: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Data Início *</label>
              <input type="date" required value={formVantagem.dataInicio || ""} onChange={(e) => setFormVantagem({ ...formVantagem, dataInicio: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:outline-none text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Data Fim</label>
              <input type="date" value={formVantagem.dataFim || ""} onChange={(e) => setFormVantagem({ ...formVantagem, dataFim: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:outline-none text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Fundamento Legal</label>
            <input type="text" value={formVantagem.fundamentoLegal || ""} onChange={(e) => setFormVantagem({ ...formVantagem, fundamentoLegal: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:outline-none text-sm" placeholder="Ex: Lei Complementar nº 1.144/2011" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Observação</label>
            <textarea rows={2} value={formVantagem.observacao || ""} onChange={(e) => setFormVantagem({ ...formVantagem, observacao: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:outline-none text-sm" />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setModalVantagem(false)} className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition">Cancelar</button>
            <button type="submit" className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-sm transition">Adicionar</button>
          </div>
        </form>
      </Modal>

      {/* Modal Histórico */}
      <Modal aberto={modalHist} onClose={() => setModalHist(false)} titulo="Adicionar Evento" largura="max-w-2xl">
        <form onSubmit={salvarHist} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Data do Evento *</label>
              <input type="date" required value={formHist.dataOcorrencia || ""} onChange={(e) => setFormHist({ ...formHist, dataOcorrencia: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:outline-none text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tipo de Evento *</label>
              <select required value={formHist.tipoEvento || ""} onChange={(e) => setFormHist({ ...formHist, tipoEvento: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none text-sm">
                <option value="">Selecione...</option>
                {["Admissão", "Posse", "Promoção", "Designação", "Remoção", "Readaptação", "Reversão", "Reintegração", "Progressão", "Outro"].map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Descrição *</label>
            <textarea required rows={3} value={formHist.descricao || ""} onChange={(e) => setFormHist({ ...formHist, descricao: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:outline-none text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Ato Legal</label>
            <input type="text" value={formHist.atoLegal || ""} onChange={(e) => setFormHist({ ...formHist, atoLegal: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:outline-none text-sm" placeholder="Ex: Portaria 123/2024" />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setModalHist(false)} className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition">Cancelar</button>
            <button type="submit" className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-sm transition">Adicionar</button>
          </div>
        </form>
      </Modal>

      {/* Modal Afastamento */}
      <Modal aberto={modalAfast} onClose={() => setModalAfast(false)} titulo="Registrar Afastamento" largura="max-w-2xl">
        <form onSubmit={salvarAfast} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tipo de Afastamento *</label>
            <select required value={formAfast.tipo || ""} onChange={(e) => setFormAfast({ ...formAfast, tipo: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none text-sm">
              <option value="">Selecione...</option>
              {["Férias", "Licença Médica", "Licença Maternidade", "Licença Paternidade", "Licença para Tratar de Interesses Particulares", "Licença Prêmio", "Licença para Acompanhamento", "Outro"].map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Data Início *</label>
              <input type="date" required value={formAfast.dataInicio || ""} onChange={(e) => setFormAfast({ ...formAfast, dataInicio: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:outline-none text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Data Fim</label>
              <input type="date" value={formAfast.dataFim || ""} onChange={(e) => setFormAfast({ ...formAfast, dataFim: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:outline-none text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Dias</label>
              <input type="number" value={formAfast.dias || ""} onChange={(e) => setFormAfast({ ...formAfast, dias: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:outline-none text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Motivo</label>
            <textarea rows={2} value={formAfast.motivo || ""} onChange={(e) => setFormAfast({ ...formAfast, motivo: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:outline-none text-sm" />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setModalAfast(false)} className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition">Cancelar</button>
            <button type="submit" className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-sm transition">Registrar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function StatBox({ label, valor }: { label: string; valor: string | number }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 print-card">
      <p className="text-xs text-slate-500 font-medium">{label}</p>
      <p className="text-xl md:text-2xl font-bold text-slate-900 mt-1">{valor}</p>
    </div>
  );
}
