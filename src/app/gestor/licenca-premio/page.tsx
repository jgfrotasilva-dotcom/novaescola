"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Modal } from "@/components/Modal";
import { formatarData } from "@/lib/format";

const SALDO_INICIAL = 90;
const DIAS_VALIDOS = [15, 30, 45, 60, 75, 90];

type Certidao = {
  id: number;
  numero: number;
  ano: number;
  periodoInicial: string;
  periodoFinal: string;
  dataDoe: string | null;
  saldoInicial: number;
  saldoAtual: number;
  saldoConsumido: number;
  observacao: string | null;
  fruicoes: Fruicao[];
};

type Fruicao = {
  id: number;
  tipo: "gozo" | "pecunia";
  dias: number;
  dataInicio: string | null;
  dataFim: string | null;
  dataDoeAutorizacao: string | null;
  anoPecunia: number | null;
  observacao: string | null;
  criadoEm: string;
};

type ServidorInfo = {
  id: number;
  nome: string;
  matricula: string;
  cargo: string;
  categoria: string | null;
  podeTerLicencaPremio: boolean;
};

type ResumoItem = {
  servidor: ServidorInfo;
  totalCertidoes: number;
  certidoesZeradas: number;
  saldoTotal: number;
};

export default function LicencaPremioPage() {
  const router = useRouter();
  const [sessao, setSessao] = useState<any>(null);
  const [aba, setAba] = useState<"certidoes" | "resumo">("certidoes");

  // Aba Certidões
  const [servidores, setServidores] = useState<any[]>([]);
  const [servidorSelecionado, setServidorSelecionado] = useState<string>("");
  const [servidorInfo, setServidorInfo] = useState<ServidorInfo | null>(null);
  const [certidoes, setCertidoes] = useState<Certidao[]>([]);
  const [carregando, setCarregando] = useState(false);

  // Modais
  const [modalCertidao, setModalCertidao] = useState(false);
  const [formCertidao, setFormCertidao] = useState({
    numero: "",
    ano: new Date().getFullYear(),
    periodoInicial: "",
    periodoFinal: "",
    dataDoe: "",
    observacao: "",
  });

  const [modalFruicao, setModalFruicao] = useState(false);
  const [certidaoFruicao, setCertidaoFruicao] = useState<Certidao | null>(null);
  const [tipoFruicao, setTipoFruicao] = useState<"gozo" | "pecunia">("gozo");
  const [formFruicao, setFormFruicao] = useState({
    dias: 30,
    dataInicio: "",
    dataFim: "",
    dataDoeAutorizacao: "",
    anoPecunia: new Date().getFullYear(),
    observacao: "",
  });

  // Resumo
  const [resumos, setResumos] = useState<ResumoItem[]>([]);

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

  async function carregarCertidoes(servidorId: string) {
    if (!servidorId) {
      setServidorInfo(null);
      setCertidoes([]);
      return;
    }
    setCarregando(true);
    try {
      const r = await (await fetch(`/api/licenca-premio?tipo=certidoes&servidorId=${servidorId}`)).json();
      setServidorInfo(r.servidor);
      setCertidoes(r.certidoes || []);
    } finally {
      setCarregando(false);
    }
  }

  async function carregarResumo() {
    const r = await (await fetch("/api/licenca-premio?tipo=resumo")).json();
    setResumos(r);
  }

  useEffect(() => {
    if (aba === "resumo") carregarResumo();
  }, [aba]);

  function abrirNovaCertidao() {
    setFormCertidao({
      numero: "",
      ano: new Date().getFullYear(),
      periodoInicial: "",
      periodoFinal: "",
      dataDoe: "",
      observacao: "",
    });
    setModalCertidao(true);
  }

  async function salvarCertidao(e: FormEvent) {
    e.preventDefault();
    if (!servidorInfo) return;

    const res = await fetch("/api/licenca-premio?tipo=certidao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        servidorId: servidorInfo.id,
        numero: Number(formCertidao.numero),
        ano: Number(formCertidao.ano),
        periodoInicial: formCertidao.periodoInicial,
        periodoFinal: formCertidao.periodoFinal,
        dataDoe: formCertidao.dataDoe || null,
        observacao: formCertidao.observacao || null,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      alert("Erro: " + err.error);
      return;
    }

    setModalCertidao(false);
    carregarCertidoes(String(servidorInfo.id));
  }

  async function excluirCertidao(id: number) {
    if (!confirm("Excluir esta certidão? Todas as fruições vinculadas serão removidas.")) return;
    await fetch(`/api/licenca-premio?id=${id}&tipo=certidao`, { method: "DELETE" });
    if (servidorInfo) carregarCertidoes(String(servidorInfo.id));
  }

  function abrirFruicao(certidao: Certidao) {
    setCertidaoFruicao(certidao);
    setTipoFruicao("gozo");
    setFormFruicao({
      dias: 30,
      dataInicio: "",
      dataFim: "",
      dataDoeAutorizacao: "",
      anoPecunia: new Date().getFullYear(),
      observacao: "",
    });
    setModalFruicao(true);
  }

  async function salvarFruicao(e: FormEvent) {
    e.preventDefault();
    if (!certidaoFruicao) return;

    // Validação local: saldo zerado
    if (certidaoFruicao.saldoAtual <= 0) {
      alert("Certidão zerada. Não é possível registrar fruição.");
      return;
    }

    const body: any = {
      certidaoId: certidaoFruicao.id,
      tipoFruicao,
      dias: formFruicao.dias,
      observacao: formFruicao.observacao || null,
    };

    if (tipoFruicao === "gozo") {
      body.dataInicio = formFruicao.dataInicio;
      body.dataFim = formFruicao.dataFim;
      body.dataDoeAutorizacao = formFruicao.dataDoeAutorizacao || null;
    } else {
      body.anoPecunia = formFruicao.anoPecunia;
    }

    const res = await fetch("/api/licenca-premio?tipo=fruicao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json();
      alert("Erro: " + err.error);
      return;
    }

    setModalFruicao(false);
    carregarCertidoes(String(servidorInfo!.id));
  }

  async function excluirFruicao(id: number) {
    if (!confirm("Excluir esta fruição? O saldo será recalculado.")) return;
    await fetch(`/api/licenca-premio?id=${id}&tipo=fruicao`, { method: "DELETE" });
    if (servidorInfo) carregarCertidoes(String(servidorInfo.id));
  }

  if (!sessao) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-slate-700 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const saldoTotalGeral = certidoes.reduce((acc, c) => acc + c.saldoAtual, 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <Header nome={sessao.nome} papel="gestor" voltarPara="/gestor" />

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
              🏖️ Licença Prêmio
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Certidões (90 dias cada) e fruições em Gozo ou Pecúnia
            </p>
          </div>
          <Link
            href="/gestor"
            className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition text-sm"
          >
            ← Voltar ao painel
          </Link>
        </div>

        {/* Aviso de elegibilidade */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-6 text-sm text-indigo-900">
          <p className="font-semibold flex items-center gap-2">
            <span>ℹ️</span> Direito à Licença Prêmio
          </p>
          <p className="mt-1 text-indigo-800">
            Apenas servidores com categoria <strong>"A-Efetivo"</strong> ou <strong>"ACT - F"</strong>.
            Cada certidão tem saldo inicial de <strong>90 dias</strong>, que podem ser gozados em
            períodos de <strong>15, 30, 45, 60, 75 ou 90 dias</strong>, ou convertidos em pecúnia.
          </p>
        </div>

        {/* Tabs */}
        <div className="p-1 bg-white rounded-xl border border-slate-200 inline-flex gap-1 mb-6">
          <button
            onClick={() => setAba("certidoes")}
            className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition ${
              aba === "certidoes" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            📋 Certidões e Fruições
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

        {aba === "certidoes" && (
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
                  carregarCertidoes(e.target.value);
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
                <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-2xl p-6 text-white">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <h3 className="text-xl font-bold">{servidorInfo.nome}</h3>
                      <p className="text-indigo-100 text-sm mt-1">
                        {servidorInfo.cargo} · Matrícula {servidorInfo.matricula}
                      </p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {servidorInfo.categoria && (
                          <span className="px-2.5 py-0.5 bg-white/10 rounded-full text-xs font-semibold">
                            Categoria: {servidorInfo.categoria}
                          </span>
                        )}
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            servidorInfo.podeTerLicencaPremio
                              ? "bg-emerald-400/20 text-emerald-100"
                              : "bg-rose-400/20 text-rose-100"
                          }`}
                        >
                          {servidorInfo.podeTerLicencaPremio ? "✓ Com direito" : "✗ Sem direito"}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-widest text-indigo-200">
                        Saldo Total Disponível
                      </p>
                      <p className="text-4xl font-bold">{saldoTotalGeral}</p>
                      <p className="text-sm text-indigo-100">dias em {certidoes.length} certidão(ões)</p>
                    </div>
                  </div>
                </div>

                {/* Aviso se não tem direito */}
                {!servidorInfo.podeTerLicencaPremio && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">
                    <p className="font-semibold flex items-center gap-2">
                      <span>⚠️</span> Servidor sem direito à Licença Prêmio
                    </p>
                    <p className="mt-1">
                      A categoria <strong>"{servidorInfo.categoria || "(não informada)"}"</strong> não
                      está entre as elegíveis (A-Efetivo ou ACT-F).
                    </p>
                  </div>
                )}

                {/* Botão cadastrar */}
                {servidorInfo.podeTerLicencaPremio && (
                  <div className="flex justify-end">
                    <button
                      onClick={abrirNovaCertidao}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold transition"
                    >
                      + Nova Certidão
                    </button>
                  </div>
                )}

                {/* Lista de certidões */}
                {certidoes.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center">
                    <p className="text-slate-500">Nenhuma certidão cadastrada.</p>
                    {servidorInfo.podeTerLicencaPremio && (
                      <p className="text-xs text-slate-400 mt-2">
                        Clique em "Nova Certidão" para começar.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {certidoes.map((c) => {
                      const zerada = c.saldoAtual === 0;
                      const percentConsumido = ((c.saldoConsumido / c.saldoInicial) * 100).toFixed(0);

                      return (
                        <div
                          key={c.id}
                          className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
                            zerada ? "border-slate-200 opacity-75" : "border-slate-200"
                          }`}
                        >
                          {/* Cabeçalho */}
                          <div
                            className={`px-5 py-4 flex items-start justify-between gap-3 flex-wrap ${
                              zerada
                                ? "bg-slate-100"
                                : "bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
                            }`}
                          >
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className={`text-lg font-bold ${zerada ? "text-slate-900" : ""}`}>
                                  Certidão nº {c.numero}/{c.ano}
                                </h4>
                                {zerada && (
                                  <span className="text-xs font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full ring-1 ring-rose-200">
                                    ZERADA
                                  </span>
                                )}
                                {!zerada && c.saldoAtual < c.saldoInicial && (
                                  <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full">
                                    PARCIAL
                                  </span>
                                )}
                                {!zerada && c.saldoAtual === c.saldoInicial && (
                                  <span className="text-xs font-bold bg-emerald-400/30 px-2 py-0.5 rounded-full">
                                    INTEGRAL
                                  </span>
                                )}
                              </div>
                              <p className={`text-sm mt-1 ${zerada ? "text-slate-600" : "text-indigo-100"}`}>
                                Período aquisitivo: {formatarData(c.periodoInicial)} →{" "}
                                {formatarData(c.periodoFinal)}
                                {c.dataDoe && ` · DOE: ${formatarData(c.dataDoe)}`}
                              </p>
                            </div>
                            <div className={`text-right ${zerada ? "" : ""}`}>
                              <p className={`text-xs uppercase tracking-widest ${zerada ? "text-slate-500" : "text-indigo-100"}`}>
                                Saldo
                              </p>
                              <p className={`text-3xl font-bold ${zerada ? "text-slate-400" : ""}`}>
                                {c.saldoAtual}<span className="text-sm font-normal">/{c.saldoInicial}d</span>
                              </p>
                            </div>
                          </div>

                          {/* Barra de progresso */}
                          <div className="h-1.5 bg-slate-100">
                            <div
                              className={`h-full ${
                                zerada ? "bg-rose-400" : "bg-gradient-to-r from-indigo-500 to-purple-500"
                              }`}
                              style={{ width: `${percentConsumido}%` }}
                            ></div>
                          </div>

                          {/* Corpo */}
                          <div className="p-5">
                            {/* Fruições */}
                            {c.fruicoes.length > 0 && (
                              <div className="mb-4">
                                <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-2">
                                  Fruições registradas ({c.fruicoes.length})
                                </p>
                                <div className="space-y-2">
                                  {c.fruicoes.map((f) => (
                                    <div
                                      key={f.id}
                                      className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-lg group"
                                    >
                                      <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <span
                                          className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ring-1 ${
                                            f.tipo === "gozo"
                                              ? "bg-sky-100 text-sky-700 ring-sky-200"
                                              : "bg-amber-100 text-amber-700 ring-amber-200"
                                          }`}
                                        >
                                          {f.tipo === "gozo" ? "🏖️ GOZO" : "💰 PECÚNIA"}
                                        </span>
                                        <div className="min-w-0">
                                          <p className="text-sm font-semibold text-slate-900">
                                            {f.dias} dia{f.dias > 1 ? "s" : ""}
                                          </p>
                                          <p className="text-xs text-slate-500 truncate">
                                            {f.tipo === "gozo"
                                              ? `${formatarData(f.dataInicio)} → ${formatarData(f.dataFim)}${f.dataDoeAutorizacao ? ` · DOE ${formatarData(f.dataDoeAutorizacao)}` : ""}`
                                              : `Ano ${f.anoPecunia}`}
                                          </p>
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => excluirFruicao(f.id)}
                                        className="no-print opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-rose-50 hover:text-rose-700 text-slate-400 transition"
                                        title="Excluir fruição"
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                                          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                                        </svg>
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Ações */}
                            <div className="flex gap-2 pt-3 border-t border-slate-100">
                              <button
                                onClick={() => abrirFruicao(c)}
                                disabled={zerada}
                                className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-sm transition disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
                              >
                                + Registrar Fruição {zerada && "(zerada)"}
                              </button>
                              <button
                                onClick={() => excluirCertidao(c.id)}
                                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-semibold text-sm transition"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
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
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-600">
                    <tr>
                      <th className="px-5 py-3">Servidor</th>
                      <th className="px-3 py-3">Categoria</th>
                      <th className="px-3 py-3 text-center">Certidões</th>
                      <th className="px-3 py-3 text-center">Zeradas</th>
                      <th className="px-3 py-3 text-center">Saldo Total</th>
                      <th className="px-3 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {resumos.map((r) => (
                      <tr
                        key={r.servidor.id}
                        className={`hover:bg-slate-50 transition ${!r.servidor.podeTerLicencaPremio ? "opacity-50" : ""}`}
                      >
                        <td className="px-5 py-3">
                          <p className="font-semibold text-slate-900">{r.servidor.nome}</p>
                          <p className="text-xs text-slate-500">{r.servidor.cargo}</p>
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ring-1 ${
                              r.servidor.podeTerLicencaPremio
                                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                : "bg-slate-50 text-slate-600 ring-slate-200"
                            }`}
                          >
                            {r.servidor.categoria || "—"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center font-bold text-slate-900">
                          {r.totalCertidoes}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {r.certidoesZeradas > 0 ? (
                            <span className="text-rose-700 font-semibold">{r.certidoesZeradas}</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="font-bold text-indigo-700">{r.saldoTotal}d</span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <button
                            onClick={() => {
                              setAba("certidoes");
                              setServidorSelecionado(String(r.servidor.id));
                              carregarCertidoes(String(r.servidor.id));
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

        {/* Modal Certidão */}
        <Modal
          aberto={modalCertidao}
          onClose={() => setModalCertidao(false)}
          titulo="Nova Certidão de Licença Prêmio"
          largura="max-w-2xl"
        >
          <form onSubmit={salvarCertidao} className="space-y-4">
            {servidorInfo && (
              <div className="bg-slate-50 rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold">
                  {servidorInfo.nome.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{servidorInfo.nome}</p>
                  <p className="text-xs text-slate-500">
                    {servidorInfo.cargo} · {servidorInfo.categoria}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Saldo fixo</p>
                  <p className="font-bold text-indigo-700">90 dias</p>
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Número da Certidão *
                </label>
                <input
                  type="number"
                  min="1"
                  value={formCertidao.numero}
                  onChange={(e) => setFormCertidao({ ...formCertidao, numero: e.target.value })}
                  required
                  placeholder="Ex: 123"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Ano *</label>
                <input
                  type="number"
                  value={formCertidao.ano}
                  onChange={(e) => setFormCertidao({ ...formCertidao, ano: Number(e.target.value) })}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Período Inicial (aquisitivo) *
                </label>
                <input
                  type="date"
                  value={formCertidao.periodoInicial}
                  onChange={(e) => setFormCertidao({ ...formCertidao, periodoInicial: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Período Final (aquisitivo) *
                </label>
                <input
                  type="date"
                  value={formCertidao.periodoFinal}
                  onChange={(e) => setFormCertidao({ ...formCertidao, periodoFinal: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Data do DOE (publicação)
              </label>
              <input
                type="date"
                value={formCertidao.dataDoe}
                onChange={(e) => setFormCertidao({ ...formCertidao, dataDoe: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Observação</label>
              <textarea
                rows={2}
                value={formCertidao.observacao}
                onChange={(e) => setFormCertidao({ ...formCertidao, observacao: e.target.value })}
                placeholder="Ex: Processo nº 1234/2024"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalCertidao(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold transition"
              >
                ✓ Cadastrar Certidão
              </button>
            </div>
          </form>
        </Modal>

        {/* Modal Fruição */}
        <Modal
          aberto={modalFruicao}
          onClose={() => setModalFruicao(false)}
          titulo="Registrar Fruição"
          largura="max-w-2xl"
        >
          {certidaoFruicao && (
            <form onSubmit={salvarFruicao} className="space-y-4">
              {/* Info da certidão */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-indigo-700 font-semibold">Certidão</p>
                  <p className="font-bold text-slate-900">
                    nº {certidaoFruicao.numero}/{certidaoFruicao.ano}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-indigo-700 font-semibold">Saldo Disponível</p>
                  <p className="text-2xl font-bold text-indigo-700">
                    {certidaoFruicao.saldoAtual}
                    <span className="text-sm font-normal text-slate-500"> dias</span>
                  </p>
                </div>
              </div>

              {/* Tipo de fruição */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Tipo de Fruição *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTipoFruicao("gozo")}
                    className={`p-4 rounded-xl border-2 transition text-left ${
                      tipoFruicao === "gozo"
                        ? "border-sky-500 bg-sky-50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <p className="text-2xl mb-1">🏖️</p>
                    <p className="font-bold text-slate-900">GOZO</p>
                    <p className="text-xs text-slate-500">Tirar os dias de folga</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoFruicao("pecunia")}
                    className={`p-4 rounded-xl border-2 transition text-left ${
                      tipoFruicao === "pecunia"
                        ? "border-amber-500 bg-amber-50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <p className="text-2xl mb-1">💰</p>
                    <p className="font-bold text-slate-900">PECÚNIA</p>
                    <p className="text-xs text-slate-500">Converter em dinheiro</p>
                  </button>
                </div>
              </div>

              {/* Dias (comum aos dois) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Quantidade de Dias *
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {DIAS_VALIDOS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      disabled={d > certidaoFruicao.saldoAtual}
                      onClick={() => setFormFruicao({ ...formFruicao, dias: d })}
                      className={`py-3 rounded-lg font-bold transition ${
                        formFruicao.dias === d
                          ? "bg-slate-900 text-white"
                          : d > certidaoFruicao.saldoAtual
                          ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                          : "bg-white border border-slate-200 hover:border-slate-400 text-slate-700"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
                {formFruicao.dias > certidaoFruicao.saldoAtual && (
                  <p className="text-xs text-rose-600 mt-1">
                    ⚠️ Saldo insuficiente (disponível: {certidaoFruicao.saldoAtual} dias)
                  </p>
                )}
              </div>

              {/* Campos específicos por tipo */}
              {tipoFruicao === "gozo" && (
                <div className="space-y-3 animate-fade-in">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Data de Início *
                      </label>
                      <input
                        type="date"
                        value={formFruicao.dataInicio}
                        onChange={(e) => setFormFruicao({ ...formFruicao, dataInicio: e.target.value })}
                        required
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Data do Término *
                      </label>
                      <input
                        type="date"
                        value={formFruicao.dataFim}
                        onChange={(e) => setFormFruicao({ ...formFruicao, dataFim: e.target.value })}
                        required
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:outline-none text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Data do DOE da Autorização
                    </label>
                    <input
                      type="date"
                      value={formFruicao.dataDoeAutorizacao}
                      onChange={(e) =>
                        setFormFruicao({ ...formFruicao, dataDoeAutorizacao: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:outline-none text-sm"
                    />
                  </div>
                </div>
              )}

              {tipoFruicao === "pecunia" && (
                <div className="animate-fade-in">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Ano da Pecúnia *
                  </label>
                  <input
                    type="number"
                    value={formFruicao.anoPecunia}
                    onChange={(e) =>
                      setFormFruicao({ ...formFruicao, anoPecunia: Number(e.target.value) })
                    }
                    required
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Observação</label>
                <textarea
                  rows={2}
                  value={formFruicao.observacao}
                  onChange={(e) => setFormFruicao({ ...formFruicao, observacao: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:outline-none text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalFruicao(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formFruicao.dias > certidaoFruicao.saldoAtual}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ✓ Registrar
                </button>
              </div>
            </form>
          )}
        </Modal>
      </main>
    </div>
  );
}
