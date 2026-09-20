"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Modal } from "@/components/Modal";
import { formatarData, formatarMoeda, calcularTempoServico } from "@/lib/format";

const DIAS_ENTRE_ATS = 1825;

type ServidorInfo = {
  id: number;
  nome: string;
  matricula: string;
  cargo: string;
  categoria: string | null;
  dataAdmissao: string;
  podeTerAts: boolean;
};

type ATS = {
  id: number;
  numero: number;
  dataVigencia: string;
  dataDoe: string | null;
  percentual: string;
  ehUltimo: boolean;
  proximaVigencia: string | null;
  observacao: string | null;
};

type ResumoServidor = {
  servidor: ServidorInfo;
  totalAts: number;
  percentualTotal: string;
  ultimoAts: {
    numero: number;
    dataVigencia: string;
    ehUltimo: boolean;
    proximaVigencia: string | null;
  } | null;
};

function ordinal(n: number): string {
  return `${n}º`;
}

function adicionarDias(data: string, dias: number): string {
  const d = new Date(data + "T00:00:00");
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

export default function VantagensPessoaisPage() {
  const router = useRouter();
  const [sessao, setSessao] = useState<any>(null);
  const [aba, setAba] = useState<"cadastro" | "resumo">("cadastro");

  // Aba Cadastro
  const [servidores, setServidores] = useState<any[]>([]);
  const [servidorSelecionado, setServidorSelecionado] = useState<string>("");
  const [servidorInfo, setServidorInfo] = useState<ServidorInfo | null>(null);
  const [atsLista, setAtsLista] = useState<ATS[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [proximoNumero, setProximoNumero] = useState(1);
  const [proximaVigenciaSugerida, setProximaVigenciaSugerida] = useState<string | null>(null);

  // Modal de cadastro
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState({
    numero: 1,
    dataVigencia: "",
    dataDoe: "",
    percentual: "5.00",
    ehUltimo: true,
    observacao: "",
  });

  // Aba Resumo
  const [resumos, setResumos] = useState<ResumoServidor[]>([]);

  useEffect(() => {
    async function carregar() {
      try {
        const auth = await (await fetch("/api/auth")).json();
        if (!auth.logado || auth.papel !== "gestor") {
          router.replace("/login?papel=gestor");
          return;
        }
        setSessao(auth);

        const srvs = await (await fetch("/api/servidores")).json();
        setServidores(srvs);
      } catch (err) {
        router.replace("/gestor");
      }
    }
    carregar();
  }, [router]);

  async function carregarAts(servidorId: string) {
    if (!servidorId) {
      setServidorInfo(null);
      setAtsLista([]);
      return;
    }
    setCarregando(true);
    try {
      const r = await (await fetch(`/api/vantagens-pessoais?tipo=ats&servidorId=${servidorId}`)).json();
      setServidorInfo(r.servidor);
      setAtsLista(r.ats || []);
      setProximoNumero(r.proximoNumero);
      setProximaVigenciaSugerida(r.proximaVigenciaSugerida);
    } finally {
      setCarregando(false);
    }
  }

  async function carregarResumo() {
    const r = await (await fetch("/api/vantagens-pessoais?tipo=resumo")).json();
    setResumos(r);
  }

  useEffect(() => {
    if (aba === "resumo") carregarResumo();
  }, [aba]);

  function abrirNovoAts() {
    setForm({
      numero: proximoNumero,
      dataVigencia: proximaVigenciaSugerida || "",
      dataDoe: "",
      percentual: "5.00",
      ehUltimo: true,
      observacao: "",
    });
    setModalAberto(true);
  }

  async function salvarAts(e: FormEvent) {
    e.preventDefault();
    if (!servidorInfo) return;

    const res = await fetch("/api/vantagens-pessoais", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        servidorId: servidorInfo.id,
        ...form,
        dataDoe: form.dataDoe || null,
        observacao: form.observacao || null,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      alert("Erro: " + err.error);
      return;
    }

    setModalAberto(false);
    carregarAts(String(servidorInfo.id));
  }

  async function excluirAts(id: number) {
    if (!confirm("Excluir este ATS?")) return;
    await fetch(`/api/vantagens-pessoais?id=${id}`, { method: "DELETE" });
    if (servidorInfo) carregarAts(String(servidorInfo.id));
  }

  async function atualizarUltimo(id: number, ehUltimo: boolean) {
    await fetch(`/api/vantagens-pessoais?id=${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ehUltimo }),
    });
    if (servidorInfo) carregarAts(String(servidorInfo.id));
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
              ATS — Adicional por Tempo de Serviço
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Cadastro numerado (1º, 2º, 3º...) a cada 5 anos de efetivo serviço
            </p>
          </div>
          <Link
            href="/gestor"
            className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition text-sm"
          >
            ← Voltar ao painel
          </Link>
        </div>

        {/* Aviso sobre elegibilidade */}
        <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 mb-6 text-sm text-sky-900">
          <p className="font-semibold flex items-center gap-2">
            <span>ℹ️</span> Quem tem direito ao ATS?
          </p>
          <p className="mt-1 text-sky-800">
            Servidores com categoria <strong>"A-Efetivo"</strong> ou <strong>"ACT - F"</strong>.
            A cada <strong>5 anos (1.825 dias)</strong> de efetivo exercício, o servidor adquire um
            novo ATS (5% sobre o vencimento base).
          </p>
        </div>

        {/* Tabs */}
        <div className="p-1 bg-white rounded-xl border border-slate-200 inline-flex gap-1 mb-6">
          <button
            onClick={() => setAba("cadastro")}
            className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition ${
              aba === "cadastro" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            📝 Cadastro por Servidor
          </button>
          <button
            onClick={() => setAba("resumo")}
            className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition ${
              aba === "resumo" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            📊 Resumo Geral
          </button>
        </div>

        {aba === "cadastro" && (
          <div className="space-y-6">
            {/* Seletor de servidor */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Selecione o servidor
              </label>
              <select
                value={servidorSelecionado}
                onChange={(e) => {
                  setServidorSelecionado(e.target.value);
                  carregarAts(e.target.value);
                }}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
              >
                <option value="">-- Selecione um servidor --</option>
                {servidores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nomeCompleto} · {s.cargo} {s.categoria ? `· ${s.categoria}` : ""}
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
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <h3 className="text-xl font-bold">{servidorInfo.nome}</h3>
                      <p className="text-slate-300 text-sm mt-1">
                        {servidorInfo.cargo} · Matrícula {servidorInfo.matricula}
                      </p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {servidorInfo.categoria && (
                          <span className="px-2.5 py-0.5 bg-white/10 rounded-full text-xs font-semibold">
                            Categoria: {servidorInfo.categoria}
                          </span>
                        )}
                        <span className="px-2.5 py-0.5 bg-white/10 rounded-full text-xs font-semibold">
                          Admissão: {formatarData(servidorInfo.dataAdmissao)}
                        </span>
                        <span className="px-2.5 py-0.5 bg-white/10 rounded-full text-xs font-semibold">
                          Tempo: {calcularTempoServico(servidorInfo.dataAdmissao)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-widest text-slate-300">ATS Cadastrados</p>
                      <p className="text-4xl font-bold">{atsLista.length}</p>
                      <p className="text-sm text-emerald-300 font-semibold">
                        {formatarMoeda(atsLista.reduce((a, b) => a + parseFloat(b.percentual || "0"), 0))}% total
                      </p>
                    </div>
                  </div>
                </div>

                {/* Aviso se não pode ter ATS */}
                {!servidorInfo.podeTerAts && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">
                    <p className="font-semibold flex items-center gap-2">
                      <span>⚠️</span> Servidor sem direito ao ATS
                    </p>
                    <p className="mt-1">
                      A categoria <strong>"{servidorInfo.categoria || "(não informada)"}"</strong> não
                      está entre as elegíveis (A-Efetivo ou ACT-F).
                    </p>
                  </div>
                )}

                {/* Botão cadastrar */}
                {servidorInfo.podeTerAts && (
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <p className="text-sm text-slate-600">
                      Próximo ATS a cadastrar:{" "}
                      <strong className="text-slate-900">{ordinal(proximoNumero)}</strong>
                      {proximaVigenciaSugerida && (
                        <>
                          {" "}
                          · Vigência sugerida:{" "}
                          <strong className="text-sky-700">
                            {formatarData(proximaVigenciaSugerida)}
                          </strong>
                        </>
                      )}
                    </p>
                    <button
                      onClick={abrirNovoAts}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold transition"
                    >
                      + Cadastrar {ordinal(proximoNumero)} ATS
                    </button>
                  </div>
                )}

                {/* Lista de ATS cadastrados */}
                {atsLista.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center">
                    <p className="text-slate-500">Nenhum ATS cadastrado para este servidor.</p>
                    {servidorInfo.podeTerAts && (
                      <p className="text-xs text-slate-400 mt-2">
                        Clique em "Cadastrar 1º ATS" para começar.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {atsLista.map((ats) => (
                      <div
                        key={ats.id}
                        className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
                          ats.ehUltimo
                            ? "border-emerald-300 ring-2 ring-emerald-100"
                            : "border-slate-200"
                        }`}
                      >
                        {/* Cabeçalho do card */}
                        <div
                          className={`px-5 py-3 flex items-center justify-between ${
                            ats.ehUltimo
                              ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold">{ordinal(ats.numero)}</span>
                            <span className="text-sm font-semibold">ATS</span>
                          </div>
                          {ats.ehUltimo && (
                            <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full">
                              ✓ ÚLTIMO
                            </span>
                          )}
                        </div>

                        <div className="p-5 space-y-3">
                          <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider">Vigência</p>
                            <p className="font-bold text-slate-900 text-lg">
                              {formatarData(ats.dataVigencia)}
                            </p>
                          </div>

                          {ats.dataDoe && (
                            <div>
                              <p className="text-xs text-slate-500 uppercase tracking-wider">
                                Publicação DOE
                              </p>
                              <p className="font-semibold text-slate-700">
                                {formatarData(ats.dataDoe)}
                              </p>
                            </div>
                          )}

                          <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider">Percentual</p>
                            <p className="font-bold text-emerald-700 text-xl">
                              +{formatarMoeda(ats.percentual)}%
                            </p>
                          </div>

                          {ats.ehUltimo && ats.proximaVigencia && (
                            <div className="bg-sky-50 border border-sky-200 rounded-lg p-3">
                              <p className="text-xs text-sky-700 font-semibold mb-1">
                                📅 Próximo ATS ({ordinal(ats.numero + 1)}) em:
                              </p>
                              <p className="font-bold text-sky-900 text-lg">
                                {formatarData(ats.proximaVigencia)}
                              </p>
                              <p className="text-xs text-sky-700 mt-1">
                                ({DIAS_ENTRE_ATS} dias após a vigência)
                              </p>
                            </div>
                          )}

                          {ats.observacao && (
                            <div>
                              <p className="text-xs text-slate-500 uppercase tracking-wider">Obs.</p>
                              <p className="text-sm text-slate-600">{ats.observacao}</p>
                            </div>
                          )}

                          <div className="flex gap-2 pt-3 border-t border-slate-100">
                            <button
                              onClick={() => atualizarUltimo(ats.id, !ats.ehUltimo)}
                              className="flex-1 text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition"
                            >
                              {ats.ehUltimo ? "Desmarcar último" : "Marcar como último"}
                            </button>
                            <button
                              onClick={() => excluirAts(ats.id)}
                              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-medium transition"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {aba === "resumo" && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {resumos.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-10 h-10 mx-auto border-4 border-slate-700 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-500 mt-3">Carregando resumo...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-600">
                    <tr>
                      <th className="px-5 py-3">Servidor</th>
                      <th className="px-3 py-3">Categoria</th>
                      <th className="px-3 py-3 text-center">Total ATS</th>
                      <th className="px-3 py-3 text-center">%</th>
                      <th className="px-3 py-3">Último ATS</th>
                      <th className="px-3 py-3">Próximo previsto</th>
                      <th className="px-3 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {resumos.map((r) => (
                      <tr
                        key={r.servidor.id}
                        className={`hover:bg-slate-50 transition ${
                          !r.servidor.podeTerAts ? "opacity-50" : ""
                        }`}
                      >
                        <td className="px-5 py-3">
                          <p className="font-semibold text-slate-900">{r.servidor.nome}</p>
                          <p className="text-xs text-slate-500">{r.servidor.cargo}</p>
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ring-1 ${
                              r.servidor.podeTerAts
                                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                : "bg-slate-50 text-slate-600 ring-slate-200"
                            }`}
                          >
                            {r.servidor.categoria || "—"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center font-bold text-slate-900">
                          {r.totalAts}
                        </td>
                        <td className="px-3 py-3 text-center font-bold text-emerald-700">
                          {formatarMoeda(r.percentualTotal)}%
                        </td>
                        <td className="px-3 py-3 text-slate-700">
                          {r.ultimoAts ? (
                            <>
                              {ordinal(r.ultimoAts.numero)} —{" "}
                              {formatarData(r.ultimoAts.dataVigencia)}
                            </>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {r.ultimoAts?.ehUltimo && r.ultimoAts.proximaVigencia ? (
                            <span className="text-xs font-semibold text-sky-700 bg-sky-50 px-2 py-1 rounded-full ring-1 ring-sky-200">
                              {formatarData(r.ultimoAts.proximaVigencia)}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">
                              {r.totalAts === 0 ? "—" : "(não marcado)"}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <button
                            onClick={() => {
                              setAba("cadastro");
                              setServidorSelecionado(String(r.servidor.id));
                              carregarAts(String(r.servidor.id));
                            }}
                            className="text-xs px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold transition"
                          >
                            Gerenciar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Modal de cadastro */}
        <Modal
          aberto={modalAberto}
          onClose={() => setModalAberto(false)}
          titulo={`Cadastrar ${ordinal(form.numero)} ATS`}
          largura="max-w-2xl"
        >
          <form onSubmit={salvarAts} className="space-y-4">
            {servidorInfo && (
              <div className="bg-slate-50 rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-bold">
                  {servidorInfo.nome.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{servidorInfo.nome}</p>
                  <p className="text-xs text-slate-500">
                    {servidorInfo.cargo} · {servidorInfo.categoria}
                  </p>
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Número do ATS *
                </label>
                <div className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-lg font-bold text-slate-900 text-center">
                  {ordinal(form.numero)}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Percentual (%) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.percentual}
                  onChange={(e) => setForm({ ...form, percentual: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:outline-none text-sm"
                />
                <p className="text-xs text-slate-500 mt-1">Padrão: 5,00%</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Data DOE (publicação)
                </label>
                <input
                  type="date"
                  value={form.dataDoe}
                  onChange={(e) => setForm({ ...form, dataDoe: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:outline-none text-sm"
                />
                <p className="text-xs text-slate-500 mt-1">Diário Oficial do Estado</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Data de Vigência *
              </label>
              <input
                type="date"
                value={form.dataVigencia}
                onChange={(e) => setForm({ ...form, dataVigencia: e.target.value })}
                required
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:outline-none text-sm"
              />
              <p className="text-xs text-slate-500 mt-1">Data em que o ATS passa a vigorar</p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.ehUltimo}
                  onChange={(e) => setForm({ ...form, ehUltimo: e.target.checked })}
                  className="w-5 h-5 rounded text-amber-600 mt-0.5"
                />
                <div className="flex-1">
                  <p className="font-semibold text-amber-900">
                    Este é o ÚLTIMO ATS cadastrado?
                  </p>
                  <p className="text-xs text-amber-800 mt-1">
                    Se marcado, o sistema calculará automaticamente a data de vigência do próximo
                    ATS (vigência atual + {DIAS_ENTRE_ATS} dias = 5 anos).
                  </p>
                  {form.ehUltimo && form.dataVigencia && (
                    <div className="mt-3 bg-white rounded-lg p-3 border border-amber-200">
                      <p className="text-xs text-slate-500 mb-1">📅 Próximo ATS previsto:</p>
                      <p className="font-bold text-slate-900 text-lg">
                        {ordinal(form.numero + 1)} ATS —{" "}
                        <span className="text-sky-700">
                          {formatarData(adicionarDias(form.dataVigencia, DIAS_ENTRE_ATS))}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Observação</label>
              <textarea
                rows={2}
                value={form.observacao}
                onChange={(e) => setForm({ ...form, observacao: e.target.value })}
                placeholder="Ex: Portaria nº 123/2024"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:outline-none text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalAberto(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold transition"
              >
                ✓ Cadastrar {ordinal(form.numero)} ATS
              </button>
            </div>
          </form>
        </Modal>
      </main>
    </div>
  );
}
