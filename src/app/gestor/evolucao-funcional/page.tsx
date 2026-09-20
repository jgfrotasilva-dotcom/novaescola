"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Modal } from "@/components/Modal";
import { formatarData } from "@/lib/format";

type Evolucao = {
  id: number;
  numero: number;
  nivelAnterior: string;
  nivelPosterior: string;
  dataVigencia: string;
  dataDoe: string | null;
  ehUltima: boolean;
  intersticioAnos: number | null;
  ultimaEvolucao: string | null;
  proximaData: string | null;
  dataCalculada: string | null;
  dataEfetiva: string | null;
  intervencao: string | null;
  justificativa: string | null;
  responsavel: string | null;
  criadoEm: string;
};

type Regra = {
  nivelOrigem: string;
  nivelDestino: string;
  intersticioAnos: number;
};

type ServidorInfo = {
  id: number;
  nome: string;
  matricula: string;
  cargo: string;
  categoria: string | null;
  nivel: string | null;
  dataAdmissao: string;
  elegivelCargo: boolean;
  elegivelCategoria: boolean;
  motivoInelegibilidade: string | null;
  tipoRegra: "DOCENTE" | "DIRETOR" | null;
};

const NIVEIS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

export default function EvolucaoFuncionalPage() {
  const router = useRouter();
  const [sessao, setSessao] = useState<any>(null);
  const [aba, setAba] = useState<"evolucoes" | "regras" | "nova">("evolucoes");

  const [servidores, setServidores] = useState<any[]>([]);
  const [servidorSelecionado, setServidorSelecionado] = useState<string>("");
  const [servidorInfo, setServidorInfo] = useState<ServidorInfo | null>(null);
  const [evolucoes, setEvolucoes] = useState<Evolucao[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [proximaRegra, setProximaRegra] = useState<Regra | null>(null);
  const [proximaDataSugerida, setProximaDataSugerida] = useState<string | null>(null);

  const [regras, setRegras] = useState<{ DOCENTE: Regra[]; DIRETOR: Regra[] } | null>(null);

  // Form nova evolução
  const [modalNova, setModalNova] = useState(false);
  const [form, setForm] = useState({
    nivelAnterior: "I",
    nivelPosterior: "II",
    dataVigencia: "",
    dataDoe: "",
    ehUltima: true,
    dataEfetiva: "",
    intervencao: "",
    justificativa: "",
  });
  const [erroForm, setErroForm] = useState("");

  useEffect(() => {
    async function carregar() {
      try {
        const auth = await (await fetch("/api/auth")).json();
        if (!auth.logado || auth.papel !== "gestor") {
          router.replace("/login?papel=gestor");
          return;
        }
        setSessao(auth);
        const [srvs, regs] = await Promise.all([
          fetch("/api/servidores").then((r) => r.json()),
          fetch("/api/evolucao-funcional?tipo=regras").then((r) => r.json()),
        ]);
        setServidores(srvs);
        setRegras(regs);
      } catch (err) {
        router.replace("/gestor");
      }
    }
    carregar();
  }, [router]);

  async function carregarEvolucoes(servidorId: string) {
    if (!servidorId) {
      setServidorInfo(null);
      setEvolucoes([]);
      setProximaRegra(null);
      return;
    }
    setCarregando(true);
    try {
      const r = await (await fetch(`/api/evolucao-funcional?tipo=evolucoes&servidorId=${servidorId}`)).json();
      setServidorInfo(r.servidor);
      setEvolucoes(r.evolucoes || []);
      setProximaRegra(r.proximaRegra);
      setProximaDataSugerida(r.proximaDataSugerida);
    } finally {
      setCarregando(false);
    }
  }

  function abrirNova() {
    if (!servidorInfo || !proximaRegra) return;
    setErroForm("");
    setForm({
      nivelAnterior: proximaRegra.nivelOrigem,
      nivelPosterior: proximaRegra.nivelDestino,
      dataVigencia: proximaDataSugerida || "",
      dataDoe: "",
      ehUltima: true,
      dataEfetiva: "",
      intervencao: "",
      justificativa: "",
    });
    setModalNova(true);
  }

  async function alternarUltima(ev: Evolucao) {
    const novoValor = !ev.ehUltima;
    const res = await fetch(`/api/evolucao-funcional?id=${ev.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ehUltima: novoValor }),
    });
    if (!res.ok) {
      alert("Erro ao atualizar evolução");
      return;
    }
    if (servidorInfo) carregarEvolucoes(String(servidorInfo.id));
  }

  async function salvarNova(e: FormEvent) {
    e.preventDefault();
    if (!servidorInfo) return;
    setErroForm("");

    const res = await fetch("/api/evolucao-funcional", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        servidorId: servidorInfo.id,
        ...form,
        dataDoe: form.dataDoe || null,
        dataEfetiva: form.dataEfetiva || null,
        intervencao: form.intervencao || null,
        justificativa: form.justificativa || null,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      setErroForm(err.error || "Erro ao salvar");
      return;
    }

    setModalNova(false);
    carregarEvolucoes(String(servidorInfo.id));
  }

  async function excluir(id: number) {
    if (!confirm("Excluir esta evolução?")) return;
    await fetch(`/api/evolucao-funcional?id=${id}`, { method: "DELETE" });
    if (servidorInfo) carregarEvolucoes(String(servidorInfo.id));
  }

  if (!sessao) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-slate-700 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header nome={sessao.nome} papel="gestor" voltarPara="/gestor" />

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
              📈 Evolução Funcional — Via Não Acadêmica
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              PEB I, PEB II e Diretor de Escola · Categorias A-Efetivo e ACT-F
            </p>
          </div>
          <Link
            href="/gestor"
            className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition text-sm"
          >
            ← Voltar ao painel
          </Link>
        </div>

        {/* Tabs */}
        <div className="p-1 bg-white rounded-xl border border-slate-200 inline-flex gap-1 mb-6 flex-wrap">
          <button
            onClick={() => setAba("evolucoes")}
            className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition ${
              aba === "evolucoes" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            📋 Evoluções do Servidor
          </button>
          <button
            onClick={() => setAba("regras")}
            className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition ${
              aba === "regras" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            📊 Tabelas de Regras
          </button>
        </div>

        {aba === "evolucoes" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Selecione o servidor
              </label>
              <select
                value={servidorSelecionado}
                onChange={(e) => {
                  setServidorSelecionado(e.target.value);
                  carregarEvolucoes(e.target.value);
                }}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
              >
                <option value="">-- Selecione um servidor --</option>
                {servidores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nomeCompleto} · {s.cargo} {s.nivel ? `· Nível ${s.nivel}` : ""}
                  </option>
                ))}
              </select>
            </div>

            {carregando && (
              <div className="text-center py-8">
                <div className="w-10 h-10 mx-auto border-4 border-slate-700 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}

            {!carregando && servidorInfo && (
              <>
                {/* Info do servidor */}
                <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-6 text-white">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <h3 className="text-xl font-bold">{servidorInfo.nome}</h3>
                      <p className="text-emerald-100 text-sm mt-1">
                        {servidorInfo.cargo} · Matrícula {servidorInfo.matricula}
                      </p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {servidorInfo.categoria && (
                          <span className="px-2.5 py-0.5 bg-white/10 rounded-full text-xs font-semibold">
                            {servidorInfo.categoria}
                          </span>
                        )}
                        {servidorInfo.nivel && (
                          <span className="px-2.5 py-0.5 bg-white/20 rounded-full text-xs font-bold">
                            Nível {servidorInfo.nivel}
                          </span>
                        )}
                        {servidorInfo.tipoRegra && (
                          <span className="px-2.5 py-0.5 bg-white/10 rounded-full text-xs font-semibold">
                            Regra: {servidorInfo.tipoRegra}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-widest text-emerald-100">
                        Evoluções Registradas
                      </p>
                      <p className="text-4xl font-bold">{evolucoes.length}</p>
                    </div>
                  </div>
                </div>

                {/* Alertas de inelegibilidade */}
                {(!servidorInfo.elegivelCargo || !servidorInfo.elegivelCategoria) && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">
                    <p className="font-semibold flex items-center gap-2">
                      <span>⚠️</span> Servidor sem direito à Evolução Funcional
                    </p>
                    <p className="mt-1">{servidorInfo.motivoInelegibilidade}</p>
                  </div>
                )}

                {/* Próxima evolução sugerida */}
                {servidorInfo.elegivelCargo && servidorInfo.elegivelCategoria && proximaRegra && (
                  <div className="bg-sky-50 border border-sky-200 rounded-xl p-5">
                    <p className="text-xs uppercase tracking-widest text-sky-700 font-bold mb-1">
                      Próxima evolução prevista
                    </p>
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <p className="text-2xl font-bold text-slate-900">
                          Nível {proximaRegra.nivelOrigem} → {proximaRegra.nivelDestino}
                        </p>
                        <p className="text-sm text-slate-600 mt-1">
                          Interstício: <strong>{proximaRegra.intersticioAnos} anos</strong>
                        </p>
                        {proximaDataSugerida && (
                          <p className="text-sm text-sky-700 mt-1">
                            📅 Data prevista: <strong>{formatarData(proximaDataSugerida)}</strong>
                          </p>
                        )}
                      </div>
                      <button
                        onClick={abrirNova}
                        className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold transition"
                      >
                        + Registrar Evolução
                      </button>
                    </div>
                  </div>
                )}

                {servidorInfo.elegivelCargo && servidorInfo.elegivelCategoria && !proximaRegra && evolucoes.length > 0 && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-900">
                    <p className="font-semibold">🎉 Nível máximo atingido (VIII)</p>
                  </div>
                )}

                {/* Lista de evoluções */}
                {evolucoes.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center">
                    <p className="text-slate-500">Nenhuma evolução registrada.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {evolucoes.map((ev) => (
                      <div
                        key={ev.id}
                        className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-xl text-white flex items-center justify-center font-bold ${ev.ehUltima ? "bg-emerald-600" : "bg-slate-500"}`}>
                              {ev.numero}ª
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold">
                                Evolução Funcional
                              </p>
                              <p className="text-2xl font-bold text-slate-900">
                                {ev.nivelAnterior} → {ev.nivelPosterior}
                              </p>
                            </div>
                            {ev.ehUltima && (
                              <span className="ml-2 text-xs font-bold bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full ring-1 ring-emerald-200">
                                ✓ ÚLTIMA
                              </span>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => alternarUltima(ev)}
                              title={ev.ehUltima ? "Desmarcar como última" : "Marcar como última"}
                              className={`p-2 rounded-lg text-xs font-semibold transition ${
                                ev.ehUltima
                                  ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                            >
                              {ev.ehUltima ? "✓ Última" : "Marcar última"}
                            </button>
                            <button
                              onClick={() => excluir(ev.id)}
                              className="p-2 rounded-lg hover:bg-rose-50 hover:text-rose-700 text-slate-400 transition"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-4">
                          <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider">Vigência</p>
                            <p className="font-semibold text-slate-900">{formatarData(ev.dataVigencia)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider">DOE</p>
                            <p className="font-semibold text-slate-900">{formatarData(ev.dataDoe)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider">Interstício</p>
                            <p className="font-semibold text-slate-900">{ev.intersticioAnos} anos</p>
                          </div>
                        </div>

                        {/* Datas adicionais */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs border-t border-slate-100 pt-3">
                          {ev.ultimaEvolucao && (
                            <div>
                              <p className="text-slate-500">Última evolução</p>
                              <p className="font-semibold text-slate-700">{formatarData(ev.ultimaEvolucao)}</p>
                            </div>
                          )}
                          {ev.dataCalculada && (
                            <div>
                              <p className="text-slate-500">Data calculada</p>
                              <p className="font-semibold text-slate-700">{formatarData(ev.dataCalculada)}</p>
                            </div>
                          )}
                          {ev.dataEfetiva && (
                            <div>
                              <p className="text-slate-500">Data efetiva</p>
                              <p className="font-semibold text-slate-700">{formatarData(ev.dataEfetiva)}</p>
                            </div>
                          )}
                          {ev.proximaData && (
                            <div>
                              <p className="text-slate-500">Próxima prevista</p>
                              <p className="font-semibold text-sky-700">{formatarData(ev.proximaData)}</p>
                            </div>
                          )}
                        </div>

                        {/* Extras */}
                        {(ev.intervencao || ev.justificativa || ev.responsavel) && (
                          <div className="border-t border-slate-100 pt-3 mt-3 text-xs space-y-1">
                            {ev.intervencao && (
                              <p><span className="text-slate-500">Intervenção:</span> <span className="text-slate-700">{ev.intervencao}</span></p>
                            )}
                            {ev.justificativa && (
                              <p><span className="text-slate-500">Justificativa:</span> <span className="text-slate-700">{ev.justificativa}</span></p>
                            )}
                            {ev.responsavel && (
                              <p><span className="text-slate-500">Responsável:</span> <span className="text-slate-700">{ev.responsavel}</span></p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {aba === "regras" && regras && (
          <div className="space-y-6">
            {/* Docentes */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-5 py-4">
                <h3 className="font-bold text-lg">📚 Regras para DOCENTES (PEB I e PEB II)</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-600">
                    <tr>
                      <th className="px-4 py-3 text-left">Transição</th>
                      <th className="px-3 py-3 text-center">Interstício</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {regras.DOCENTE.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {r.nivelOrigem} → {r.nivelDestino}
                        </td>
                        <td className="px-3 py-3 text-center">{r.intersticioAnos} anos</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Diretor */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white px-5 py-4">
                <h3 className="font-bold text-lg">👔 Regras para DIRETOR DE ESCOLA</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-600">
                    <tr>
                      <th className="px-4 py-3 text-left">Transição</th>
                      <th className="px-3 py-3 text-center">Interstício</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {regras.DIRETOR.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {r.nivelOrigem} → {r.nivelDestino}
                        </td>
                        <td className="px-3 py-3 text-center">{r.intersticioAnos} anos</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Modal Nova Evolução */}
        <Modal
          aberto={modalNova}
          onClose={() => setModalNova(false)}
          titulo="Registrar Evolução Funcional"
          largura="max-w-3xl"
        >
          <form onSubmit={salvarNova} className="space-y-4">
            {servidorInfo && (
              <div className="bg-slate-50 rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-bold">
                  {servidorInfo.nome.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{servidorInfo.nome}</p>
                  <p className="text-xs text-slate-500">{servidorInfo.cargo} · {servidorInfo.categoria}</p>
                </div>
              </div>
            )}

            {/* Transição */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <p className="text-xs uppercase tracking-widest text-emerald-700 font-bold mb-2">
                Transição de Nível
              </p>
              <div className="flex items-center justify-center gap-4">
                <div className="text-center">
                  <p className="text-xs text-slate-500">De</p>
                  <select
                    value={form.nivelAnterior}
                    onChange={(e) => setForm({ ...form, nivelAnterior: e.target.value })}
                    className="mt-1 px-3 py-2 rounded-lg border border-slate-300 bg-white font-bold text-xl text-center"
                  >
                    {NIVEIS.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <div className="text-3xl text-emerald-600 font-bold">→</div>
                <div className="text-center">
                  <p className="text-xs text-slate-500">Para</p>
                  <select
                    value={form.nivelPosterior}
                    onChange={(e) => setForm({ ...form, nivelPosterior: e.target.value })}
                    className="mt-1 px-3 py-2 rounded-lg border border-slate-300 bg-white font-bold text-xl text-center"
                  >
                    {NIVEIS.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </div>
              {proximaRegra && (
                <p className="text-xs text-center text-emerald-800 mt-2">
                  Regra: {proximaRegra.intersticioAnos} anos de interstício
                </p>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Data de Vigência *</label>
                <input
                  type="date"
                  value={form.dataVigencia}
                  onChange={(e) => setForm({ ...form, dataVigencia: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Data DOE</label>
                <input
                  type="date"
                  value={form.dataDoe}
                  onChange={(e) => setForm({ ...form, dataDoe: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                />
              </div>
            </div>

            {/* Condicional: Última Evolução? */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.ehUltima}
                  onChange={(e) => setForm({ ...form, ehUltima: e.target.checked })}
                  className="w-5 h-5 rounded text-amber-600 mt-0.5"
                />
                <div className="flex-1">
                  <p className="font-semibold text-amber-900">
                    Esta é a ÚLTIMA evolução cadastrada?
                  </p>
                  <p className="text-xs text-amber-800 mt-1">
                    Se marcado, o sistema calculará automaticamente a data da próxima evolução
                    (data de vigência + interstício do próximo nível).
                  </p>
                  {form.ehUltima && form.dataVigencia && proximaRegra && (
                    <div className="mt-3 bg-white rounded-lg p-3 border border-amber-200">
                      <p className="text-xs text-slate-500 mb-1">📅 Próxima evolução prevista:</p>
                      <p className="font-bold text-slate-900 text-lg">
                        {proximaRegra.nivelDestino} → {NIVEIS[NIVEIS.indexOf(proximaRegra.nivelDestino) + 1] || "—"}
                      </p>
                      <p className="text-sm text-sky-700 mt-1">
                        <strong>Data prevista:</strong>{" "}
                        {(() => {
                          const d = new Date(form.dataVigencia + "T00:00:00");
                          d.setFullYear(d.getFullYear() + (proximaRegra.intersticioAnos || 0));
                          return formatarData(d.toISOString().slice(0, 10));
                        })()}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        (vigência atual + {proximaRegra.intersticioAnos} anos)
                      </p>
                    </div>
                  )}
                </div>
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Data Efetiva</label>
              <input
                type="date"
                value={form.dataEfetiva}
                onChange={(e) => setForm({ ...form, dataEfetiva: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Intervenção</label>
                <input
                  type="text"
                  value={form.intervencao}
                  onChange={(e) => setForm({ ...form, intervencao: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Justificativa</label>
                <input
                  type="text"
                  value={form.justificativa}
                  onChange={(e) => setForm({ ...form, justificativa: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                />
              </div>
            </div>

            {erroForm && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm p-3 rounded-lg">
                ⚠️ {erroForm}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalNova(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold transition"
              >
                ✓ Registrar Evolução
              </button>
            </div>
          </form>
        </Modal>
      </main>
    </div>
  );
}
