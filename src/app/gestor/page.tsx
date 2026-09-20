"use client";

import { useState, useEffect, FormEvent, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Modal } from "@/components/Modal";
import { formatarData, formatarCPF, situacaoCor, calcularTempoServico } from "@/lib/format";

type Servidor = {
  id: number;
  nomeCompleto: string;
  cpf: string;
  rg: string | null;
  dataNascimento: string | null;
  sexo: string | null;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  matricula: string;
  cargo: string;
  categoria: string | null;
  faixa: string | null;
  nivel: string | null;
  funcao: string | null;
  lotacao: string;
  unidadeExercicio: string | null;
  regimeJuridico: string | null;
  cargaHoraria: number | null;
  jornada: string | null;
  escolaridade: string | null;
  dataAdmissao: string;
  dataPosse: string | null;
  dataExercicio: string | null;
  dtingCtd: string | null;
  dtfimCtd: string | null;
  situacao: string;
  observacoes: string | null;
};

const Vazio: Partial<Servidor> = {
  nomeCompleto: "",
  cpf: "",
  rg: "",
  dataNascimento: "",
  sexo: "",
  email: "",
  telefone: "",
  endereco: "",
  matricula: "",
  cargo: "",
  categoria: "",
  faixa: "",
  nivel: "",
  funcao: "",
  lotacao: "EE Profa. Marlene Frattini",
  unidadeExercicio: "",
  regimeJuridico: "Estatutário",
  cargaHoraria: 40,
  jornada: "Diurna",
  escolaridade: "",
  dataAdmissao: "",
  dataPosse: "",
  dataExercicio: "",
  dtingCtd: "",
  dtfimCtd: "",
  situacao: "Ativo",
  observacoes: "",
};

export default function GestorPage() {
  const router = useRouter();
  const [sessao, setSessao] = useState<{ nome: string; papel: "gestor" } | null>(null);
  const [servidores, setServidores] = useState<Servidor[]>([]);
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Servidor | null>(null);
  const [form, setForm] = useState<Partial<Servidor>>(Vazio);
  const [aba, setAba] = useState<"lista" | "catalogo">("lista");
  const [modalImport, setModalImport] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      try {
        const ctrl = new AbortController();
        const timeout = setTimeout(() => ctrl.abort(), 10000);
        const res = await fetch("/api/auth", { signal: ctrl.signal });
        clearTimeout(timeout);
        const auth = await res.json();
        if (!ativo) return;

        if (!auth.logado || auth.papel !== "gestor") {
          router.replace("/login?papel=gestor");
          return;
        }
        setSessao(auth);
        await recarregar("");
      } catch (err) {
        if (!ativo) return;
        setErro("Não foi possível conectar ao servidor. Tente novamente.");
        setCarregando(false);
      }
    }
    carregar();
    return () => { ativo = false; };
  }, [router]);

  async function recarregar(q: string) {
    const url = q ? `/api/servidores?q=${encodeURIComponent(q)}` : "/api/servidores";
    const rows = await (await fetch(url)).json();
    setServidores(rows);
    setCarregando(false);
  }

  function abrirNovo() {
    setEditando(null);
    setForm(Vazio);
    setModalAberto(true);
  }

  function abrirEditar(s: Servidor) {
    setEditando(s);
    setForm(s);
    setModalAberto(true);
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    const method = editando ? "PUT" : "POST";
    const url = editando ? `/api/servidores?id=${editando.id}` : "/api/servidores";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      alert("Erro ao salvar: " + (await res.text()));
      return;
    }
    setModalAberto(false);
    recarregar(busca);
  }

  async function excluir(s: Servidor) {
    if (!confirm(`Excluir o servidor ${s.nomeCompleto}? Esta ação removerá também suas vantagens, histórico e afastamentos.`)) return;
    await fetch(`/api/servidores?id=${s.id}`, { method: "DELETE" });
    recarregar(busca);
  }

  const filtrados = useMemo(() => servidores, [servidores]);

  if (erro) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md bg-white rounded-2xl shadow-lg border border-rose-200 p-8 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-rose-100 flex items-center justify-center text-3xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Problema de conexão</h2>
          <p className="text-slate-600 mb-5">{erro}</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold transition"
            >
              Tentar novamente
            </button>
            <Link href="/" className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition">
              Início
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!sessao) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto border-4 border-slate-700 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-slate-600">Carregando painel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header nome={sessao.nome} papel="gestor" voltarPara="/" />

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Painel do Gestor</h1>
            <p className="text-sm text-slate-500 mt-1">
              Gerencie a vida funcional dos servidores da unidade.
            </p>
          </div>
          <div className="flex items-center gap-2 no-print">
            <div className="p-1 bg-white rounded-xl border border-slate-200 flex">
              <button
                onClick={() => setAba("lista")}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${
                  aba === "lista" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Servidores
              </button>
              <button
                onClick={() => setAba("catalogo")}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${
                  aba === "catalogo" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Catálogo de Vantagens
              </button>
            </div>
          </div>
        </div>

        {aba === "lista" ? (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
              <StatBox label="Total de Servidores" valor={servidores.length} />
              <StatBox label="Ativos" valor={servidores.filter((s) => s.situacao === "Ativo").length} cor="emerald" />
              <StatBox label="Afastados" valor={servidores.filter((s) => s.situacao === "Afastado").length} cor="amber" />
              <StatBox label="Aposentados" valor={servidores.filter((s) => s.situacao === "Aposentado").length} cor="sky" />
            </div>

            {/* Atalhos rápidos */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <Link
                href="/gestor/vantagens-pessoais"
                className="group bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-5 text-white shadow-md hover:shadow-lg transition"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-indigo-200 font-semibold mb-1">
                      Novo módulo
                    </p>
                    <h3 className="text-lg font-bold">Vantagens Pessoais</h3>
                    <p className="text-sm text-indigo-100 mt-1">
                      ATS, Quinquênios e cálculos automáticos por tempo de serviço
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                    🧮
                  </div>
                </div>
              </Link>
              <Link
                href="/gestor"
                onClick={(e) => {
                  e.preventDefault();
                  setAba("catalogo");
                }}
                className="group bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-1">
                      Catálogo
                    </p>
                    <h3 className="text-lg font-bold text-slate-900">Tipos de Vantagem</h3>
                    <p className="text-sm text-slate-600 mt-1">
                      Gerencie o catálogo geral de vantagens
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                    📋
                  </div>
                </div>
              </Link>
              <Link
                href="/gestor/licenca-premio"
                className="group bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-1">
                      Férias especiais
                    </p>
                    <h3 className="text-lg font-bold text-slate-900">Licença Prêmio</h3>
                    <p className="text-sm text-slate-600 mt-1">
                      Certidões, gozo e pecúnia
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                    🏖️
                  </div>
                </div>
              </Link>
              <Link
                href="/gestor/evolucao-funcional"
                className="group bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-1">
                      Progressão
                    </p>
                    <h3 className="text-lg font-bold text-slate-900">Evolução Funcional</h3>
                    <p className="text-sm text-slate-600 mt-1">
                      Via não acadêmica (PEB/Diretor)
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                    📈
                  </div>
                </div>
              </Link>
            </div>

            {/* Barra de busca + ação */}
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <div className="flex-1 min-w-[240px] relative">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => {
                    setBusca(e.target.value);
                    recarregar(e.target.value);
                  }}
                  placeholder="Buscar por nome, matrícula ou CPF..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                />
              </div>
              <button
                onClick={() => setModalImport(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-sm transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                </svg>
                Importar Excel
              </button>
              <button
                onClick={abrirNovo}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold shadow-sm transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Novo Servidor
              </button>
            </div>

            {/* Tabela */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              {carregando ? (
                <div className="p-12 text-center text-slate-500">Carregando...</div>
              ) : filtrados.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-slate-600 font-medium">Nenhum servidor encontrado</p>
                  <p className="text-sm text-slate-500 mt-1">Cadastre o primeiro servidor para começar.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-600">
                      <tr>
                        <th className="px-5 py-3">Servidor</th>
                        <th className="px-3 py-3">Matrícula</th>
                        <th className="px-3 py-3">Cargo</th>
                        <th className="px-3 py-3">Admissão</th>
                        <th className="px-3 py-3">Tempo</th>
                        <th className="px-3 py-3">Situação</th>
                        <th className="px-3 py-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filtrados.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50 transition">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
                                {s.nomeCompleto.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-900 truncate">{s.nomeCompleto}</p>
                                <p className="text-xs text-slate-500">{formatarCPF(s.cpf)}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 font-mono text-slate-700">{s.matricula}</td>
                          <td className="px-3 py-3 text-slate-700">{s.cargo}</td>
                          <td className="px-3 py-3 text-slate-600">{formatarData(s.dataAdmissao)}</td>
                          <td className="px-3 py-3 text-slate-600 text-xs">{calcularTempoServico(s.dataAdmissao)}</td>
                          <td className="px-3 py-3">
                            <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ${situacaoCor(s.situacao)}`}>
                              {s.situacao}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <Link
                                href={`/gestor/servidores/${s.id}`}
                                className="p-2 rounded-lg text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 transition"
                                title="Visualizar detalhes"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                              </Link>
                              <button
                                onClick={() => abrirEditar(s)}
                                className="p-2 rounded-lg text-slate-600 hover:bg-sky-50 hover:text-sky-700 transition"
                                title="Editar"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => excluir(s)}
                                className="p-2 rounded-lg text-slate-600 hover:bg-rose-50 hover:text-rose-700 transition"
                                title="Excluir"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : (
          <CatalogoVantagens />
        )}

        {/* Modal de cadastro/edição */}
        <Modal
          aberto={modalAberto}
          onClose={() => setModalAberto(false)}
          titulo={editando ? "Editar Servidor" : "Novo Servidor"}
          largura="max-w-4xl"
        >
          <form onSubmit={salvar} className="space-y-6">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Dados Pessoais</h4>
              <div className="grid md:grid-cols-2 gap-4">
                <Input label="Nome Completo *" value={form.nomeCompleto || ""} onChange={(v) => setForm({ ...form, nomeCompleto: v })} required full />
                <Input label="CPF *" value={form.cpf || ""} onChange={(v) => setForm({ ...form, cpf: v })} required />
                <Input label="RG" value={form.rg || ""} onChange={(v) => setForm({ ...form, rg: v })} />
                <Input label="Data de Nascimento" type="date" value={form.dataNascimento || ""} onChange={(v) => setForm({ ...form, dataNascimento: v })} />
                <Input label="E-mail" type="email" value={form.email || ""} onChange={(v) => setForm({ ...form, email: v })} />
                <Input label="Telefone" value={form.telefone || ""} onChange={(v) => setForm({ ...form, telefone: v })} />
                <Input label="Endereço" value={form.endereco || ""} onChange={(v) => setForm({ ...form, endereco: v })} full />
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Dados Funcionais</h4>
              <div className="grid md:grid-cols-2 gap-4">
                <Input label="Matrícula *" value={form.matricula || ""} onChange={(v) => setForm({ ...form, matricula: v })} required />
                <Input label="Cargo *" value={form.cargo || ""} onChange={(v) => setForm({ ...form, cargo: v })} required />
                <Input label="Função" value={form.funcao || ""} onChange={(v) => setForm({ ...form, funcao: v })} />
                <Input label="Categoria" value={form.categoria || ""} onChange={(v) => setForm({ ...form, categoria: v })} />
                <Input label="Faixa" value={form.faixa || ""} onChange={(v) => setForm({ ...form, faixa: v })} />
                <Input label="Nível" value={form.nivel || ""} onChange={(v) => setForm({ ...form, nivel: v })} />
                <Select label="Sexo" value={form.sexo || ""} onChange={(v) => setForm({ ...form, sexo: v })} opcoes={["Masculino", "Feminino", "Outro"]} />
                <Input label="Lotação *" value={form.lotacao || ""} onChange={(v) => setForm({ ...form, lotacao: v })} required />
                <Input label="Unidade de Exercício" value={form.unidadeExercicio || ""} onChange={(v) => setForm({ ...form, unidadeExercicio: v })} />
                <Input label="Regime Jurídico" value={form.regimeJuridico || ""} onChange={(v) => setForm({ ...form, regimeJuridico: v })} />
                <Input label="Carga Horária (h/semana)" type="number" value={form.cargaHoraria?.toString() || ""} onChange={(v) => setForm({ ...form, cargaHoraria: v ? Number(v) : null })} />
                <Select label="Jornada" value={form.jornada || ""} onChange={(v) => setForm({ ...form, jornada: v })} opcoes={["Diurna", "Noturna", "Mista"]} />
                <Select label="Escolaridade" value={form.escolaridade || ""} onChange={(v) => setForm({ ...form, escolaridade: v })} opcoes={["Ensino Médio", "Ensino Superior", "Especialização", "Mestrado", "Doutorado"]} />
                <Select label="Situação" value={form.situacao || "Ativo"} onChange={(v) => setForm({ ...form, situacao: v })} opcoes={["Ativo", "Inativo", "Afastado", "Aposentado", "Exonerado"]} />
                <Input label="Data de Admissão *" type="date" value={form.dataAdmissao || ""} onChange={(v) => setForm({ ...form, dataAdmissao: v })} required />
                <Input label="Data de Posse" type="date" value={form.dataPosse || ""} onChange={(v) => setForm({ ...form, dataPosse: v })} />
                <Input label="Data de Exercício" type="date" value={form.dataExercicio || ""} onChange={(v) => setForm({ ...form, dataExercicio: v })} />
                <Input label="Ingresso CTD" type="date" value={form.dtingCtd || ""} onChange={(v) => setForm({ ...form, dtingCtd: v })} />
                <Input label="Fim CTD" type="date" value={form.dtfimCtd || ""} onChange={(v) => setForm({ ...form, dtfimCtd: v })} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Observações</label>
              <textarea
                value={form.observacoes || ""}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                rows={3}
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
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-sm transition"
              >
                {editando ? "Salvar Alterações" : "Cadastrar"}
              </button>
            </div>
          </form>
        </Modal>

        {/* Modal de Importação */}
        <ModalImportar
          aberto={modalImport}
          onClose={() => {
            setModalImport(false);
            recarregar(busca);
          }}
        />
      </main>
    </div>
  );
}

// ============ Modal de Importação Excel ============
type LinhaPreview = {
  nomeCompleto: string;
  cpf: string;
  rg: string | null;
  dataNascimento: string | null;
  sexo: string | null;
  telefone: string | null;
  email: string | null;
  cargo: string;
  categoria: string | null;
  faixa: string | null;
  nivel: string | null;
  jornada: string | null;
  lotacao: string;
  dataPosse: string | null;
  dataExercicio: string | null;
  dtingCtd: string | null;
  dtfimCtd: string | null;
  situacao: string;
};

function ModalImportar({ aberto, onClose }: { aberto: boolean; onClose: () => void }) {
  const [etapa, setEtapa] = useState<"upload" | "preview" | "confirma" | "resultado">("upload");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [preview, setPreview] = useState<{
    total: number;
    sucesso: number;
    importados: LinhaPreview[];
    errosValidacao: { linha: number; motivo: string }[];
  } | null>(null);
  const [resultado, setResultado] = useState<{
    inseridos: number;
    ignorados: number;
    errosValidacao: { linha: number; motivo: string }[];
    errosBanco: { linha: number; motivo: string; cpf: string }[];
    total: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function reset() {
    setEtapa("upload");
    setArquivo(null);
    setCarregando(false);
    setErro("");
    setPreview(null);
    setResultado(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function fechar() {
    reset();
    onClose();
  }

  async function handleFile(file: File) {
    const nome = file.name.toLowerCase();
    if (!nome.endsWith(".xlsx") && !nome.endsWith(".xls") && !nome.endsWith(".csv")) {
      setErro("Envie um arquivo .xlsx, .xls ou .csv");
      return;
    }
    setArquivo(file);
    setErro("");
    setCarregando(true);

    const fd = new FormData();
    fd.append("arquivo", file);
    fd.append("modo", "preview");

    try {
      const res = await fetch("/api/import", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.error || "Erro ao ler a planilha.");
        setCarregando(false);
        return;
      }
      setPreview(data);
      setEtapa("preview");
    } catch (e) {
      setErro("Erro de conexão ao processar a planilha.");
    } finally {
      setCarregando(false);
    }
  }

  async function confirmar() {
    if (!arquivo) return;
    setCarregando(true);
    setEtapa("confirma");

    const fd = new FormData();
    fd.append("arquivo", arquivo);
    fd.append("modo", "confirmar");

    try {
      const res = await fetch("/api/import", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.error || "Erro ao confirmar importação.");
        setEtapa("preview");
        setCarregando(false);
        return;
      }
      setResultado(data);
      setEtapa("resultado");
    } catch {
      setErro("Erro de conexão.");
      setEtapa("preview");
    } finally {
      setCarregando(false);
    }
  }

  function baixarModelo() {
    const a = document.createElement("a");
    a.href = "/api/import?modelo=1";
    a.download = "modelo_servidores.xlsx";
    a.click();
  }

  return (
    <Modal aberto={aberto} onClose={fechar} titulo="📥 Importar Planilha Excel" largura="max-w-5xl">
      <div className="space-y-5">
        {etapa === "upload" && (
          <>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm text-slate-600">
                Envie uma planilha (.xlsx ou .csv) com o pré-cadastro dos servidores.
              </p>
              <button
                onClick={baixarModelo}
                className="inline-flex items-center gap-2 px-4 py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-lg text-sm font-semibold transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                </svg>
                Baixar modelo (.xlsx)
              </button>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files[0];
                if (f) handleFile(f);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer border-2 border-dashed rounded-2xl p-10 text-center transition ${
                dragOver ? "border-emerald-500 bg-emerald-50" : "border-slate-300 bg-slate-50 hover:border-sky-400 hover:bg-sky-50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
              <div className="w-16 h-16 mx-auto rounded-2xl bg-white shadow-sm flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-8 h-8 text-slate-600">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                </svg>
              </div>
              <p className="text-base font-semibold text-slate-900">
                {arquivo ? arquivo.name : "Arraste a planilha aqui ou clique para selecionar"}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                Formatos aceitos: .xlsx, .xls, .csv · Máx. 10 MB
              </p>
              {carregando && (
                <div className="mt-4 flex items-center justify-center gap-2 text-sky-700">
                  <div className="w-5 h-5 border-2 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm">Processando planilha...</span>
                </div>
              )}
            </div>

            {erro && (
              <div className="px-4 py-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl">
                {erro}
              </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
              <p className="font-semibold text-slate-700 mb-2">📋 Colunas esperadas (cabeçalho):</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-1 font-mono">
                {[
                  "Nome",
                  "CPF",
                  "RG",
                  "Data de Nascimento",
                  "Sexo",
                  "Telefone",
                  "Email",
                  "Cargo",
                  "Categoria",
                  "Faixa",
                  "Nivel",
                  "Jornada",
                  "Lotacao",
                  "Data de Posse",
                  "Data de Exercicio",
                  "dting_ctd",
                  "dtfimctd",
                  "Situacao",
                ].map((c) => (
                  <div key={c} className="bg-white px-2 py-1 rounded border border-slate-200">
                    {c}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {etapa === "preview" && preview && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <p className="text-xs text-slate-500 font-medium">Total na planilha</p>
                <p className="text-2xl font-bold text-slate-900">{preview.total}</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                <p className="text-xs text-emerald-700 font-medium">Registros válidos</p>
                <p className="text-2xl font-bold text-emerald-800">{preview.sucesso}</p>
              </div>
              <div className="bg-rose-50 rounded-xl p-4 border border-rose-200">
                <p className="text-xs text-rose-700 font-medium">Erros de validação</p>
                <p className="text-2xl font-bold text-rose-800">{preview.errosValidacao.length}</p>
              </div>
            </div>

            {preview.errosValidacao.length > 0 && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
                <p className="font-semibold text-rose-800 text-sm mb-2">
                  ⚠️ Linhas com problemas (não serão importadas):
                </p>
                <ul className="text-xs text-rose-700 space-y-1 max-h-32 overflow-y-auto">
                  {preview.errosValidacao.map((e, i) => (
                    <li key={i}>
                      Linha {e.linha}: {e.motivo}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">
                  Prévia dos {preview.sucesso} registros
                </p>
              </div>
              <div className="max-h-80 overflow-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr className="text-left text-[10px] uppercase tracking-wider text-slate-600">
                      <th className="px-3 py-2">Nome</th>
                      <th className="px-3 py-2">CPF</th>
                      <th className="px-3 py-2">Cargo</th>
                      <th className="px-3 py-2">Categoria</th>
                      <th className="px-3 py-2">Faixa</th>
                      <th className="px-3 py-2">Nível</th>
                      <th className="px-3 py-2">Jornada</th>
                      <th className="px-3 py-2">Lotação</th>
                      <th className="px-3 py-2">Posse</th>
                      <th className="px-3 py-2">Exercício</th>
                      <th className="px-3 py-2">Situação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {preview.importados.map((p, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-medium text-slate-900">{p.nomeCompleto}</td>
                        <td className="px-3 py-2 font-mono text-slate-600">{p.cpf}</td>
                        <td className="px-3 py-2 text-slate-700">{p.cargo}</td>
                        <td className="px-3 py-2 text-slate-600">{p.categoria || "—"}</td>
                        <td className="px-3 py-2 text-slate-600">{p.faixa || "—"}</td>
                        <td className="px-3 py-2 text-slate-600">{p.nivel || "—"}</td>
                        <td className="px-3 py-2 text-slate-600">{p.jornada || "—"}</td>
                        <td className="px-3 py-2 text-slate-600 text-[11px]">{p.lotacao}</td>
                        <td className="px-3 py-2 text-slate-600">{formatarData(p.dataPosse)}</td>
                        <td className="px-3 py-2 text-slate-600">{formatarData(p.dataExercicio)}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 ${situacaoCor(p.situacao)}`}>
                            {p.situacao}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={reset}
                className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={confirmar}
                disabled={preview.sucesso === 0}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {carregando ? "Importando..." : `✓ Confirmar importação (${preview.sucesso})`}
              </button>
            </div>
          </>
        )}

        {etapa === "confirma" && (
          <div className="py-12 text-center">
            <div className="w-16 h-16 mx-auto border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="font-semibold text-slate-900">Importando registros...</p>
            <p className="text-sm text-slate-500 mt-1">Aguarde enquanto os dados são salvos no banco.</p>
          </div>
        )}

        {etapa === "resultado" && resultado && (
          <>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500 flex items-center justify-center text-white text-3xl mb-3">
                ✓
              </div>
              <h3 className="text-xl font-bold text-emerald-900">Importação concluída!</h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs text-slate-500 font-medium">Total analisado</p>
                <p className="text-2xl font-bold text-slate-900">{resultado.total}</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <p className="text-xs text-emerald-700 font-medium">Inseridos</p>
                <p className="text-2xl font-bold text-emerald-800">{resultado.inseridos}</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-xs text-amber-700 font-medium">Ignorados (duplicados)</p>
                <p className="text-2xl font-bold text-amber-800">{resultado.ignorados}</p>
              </div>
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
                <p className="text-xs text-rose-700 font-medium">Erros</p>
                <p className="text-2xl font-bold text-rose-800">
                  {resultado.errosValidacao.length + resultado.errosBanco.length}
                </p>
              </div>
            </div>

            {resultado.inseridos > 0 && (
              <p className="text-sm text-slate-600 text-center">
                ✨ Cada servidor importado recebeu uma matrícula gerada automaticamente.
              </p>
            )}

            {(resultado.errosValidacao.length > 0 || resultado.errosBanco.length > 0) && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 max-h-48 overflow-y-auto">
                <p className="font-semibold text-rose-800 text-sm mb-2">Detalhes dos problemas:</p>
                <ul className="text-xs text-rose-700 space-y-1">
                  {resultado.errosValidacao.map((e, i) => (
                    <li key={`v${i}`}>Linha {e.linha}: {e.motivo}</li>
                  ))}
                  {resultado.errosBanco.map((e, i) => (
                    <li key={`b${i}`}>Linha {e.linha}: {e.motivo}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={fechar}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-sm transition"
              >
                Concluir
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

// ============ Subcomponentes ============
function StatBox({ label, valor, cor = "slate" }: { label: string; valor: number; cor?: "emerald" | "amber" | "sky" | "slate" }) {
  const cores = {
    slate: "text-slate-900",
    emerald: "text-emerald-700",
    amber: "text-amber-700",
    sky: "text-sky-700",
  };
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
      <p className="text-xs text-slate-500 font-medium">{label}</p>
      <p className={`text-2xl md:text-3xl font-bold mt-1 ${cores[cor]}`}>{valor}</p>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  required,
  full,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  full?: boolean;
}) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <label className="block text-xs font-semibold text-slate-700 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:outline-none text-sm"
      />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  opcoes,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  opcoes: string[];
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1.5">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none text-sm"
      >
        <option value="">—</option>
        {opcoes.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

// ============ Catálogo de Vantagens ============
type TipoVantagem = {
  id: number;
  codigo: string;
  nome: string;
  descricao: string | null;
  baseCalculo: string | null;
  ativo: boolean;
};

function CatalogoVantagens() {
  const [itens, setItens] = useState<TipoVantagem[]>([]);
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<TipoVantagem | null>(null);
  const [form, setForm] = useState({ codigo: "", nome: "", descricao: "", baseCalculo: "percentual", ativo: true });

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    const rows = await (await fetch("/api/vantagens?catalogo=1")).json();
    setItens(rows);
  }

  function abrirNovo() {
    setEditando(null);
    setForm({ codigo: "", nome: "", descricao: "", baseCalculo: "percentual", ativo: true });
    setAberto(true);
  }

  function abrirEditar(t: TipoVantagem) {
    setEditando(t);
    setForm({
      codigo: t.codigo,
      nome: t.nome,
      descricao: t.descricao || "",
      baseCalculo: t.baseCalculo || "percentual",
      ativo: t.ativo,
    });
    setAberto(true);
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    const method = editando ? "PUT" : "POST";
    const url = editando
      ? `/api/vantagens?id=${editando.id}&tipo=catalogo`
      : "/api/vantagens?tipo=catalogo";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setAberto(false);
    carregar();
  }

  async function excluir(t: TipoVantagem) {
    if (!confirm(`Excluir o tipo de vantagem "${t.nome}"? Esta ação não pode ser desfeita.`)) return;
    const res = await fetch(`/api/vantagens?id=${t.id}&tipo=catalogo`, { method: "DELETE" });
    if (!res.ok) {
      alert("Não foi possível excluir. Verifique se há servidores usando esta vantagem.");
      return;
    }
    carregar();
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <p className="text-sm text-slate-600">
          Tipos de vantagem disponíveis para atribuir aos servidores (quinquênio, sexta-parte, gratificações, etc.)
        </p>
        <button
          onClick={abrirNovo}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold shadow-sm transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Novo Tipo
        </button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {itens.map((t) => (
          <div key={t.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <p className="font-mono text-xs text-sky-700 font-bold">{t.codigo}</p>
                <h4 className="font-bold text-slate-900 text-lg leading-tight mt-0.5">{t.nome}</h4>
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ring-1 ${
                t.baseCalculo === "percentual" ? "bg-indigo-50 text-indigo-700 ring-indigo-200" : "bg-emerald-50 text-emerald-700 ring-emerald-200"
              }`}>
                {t.baseCalculo === "percentual" ? "%" : "R$"}
              </span>
            </div>
            {t.descricao && <p className="text-sm text-slate-600 mb-4 line-clamp-2">{t.descricao}</p>}
            <div className="flex gap-2 pt-3 border-t border-slate-100">
              <button onClick={() => abrirEditar(t)} className="flex-1 text-sm px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition">
                Editar
              </button>
              <button onClick={() => excluir(t)} className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-medium transition">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal aberto={aberto} onClose={() => setAberto(false)} titulo={editando ? "Editar Tipo de Vantagem" : "Novo Tipo de Vantagem"} largura="max-w-xl">
        <form onSubmit={salvar} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Input label="Código *" value={form.codigo} onChange={(v) => setForm({ ...form, codigo: v.toUpperCase() })} required />
            <Select label="Base de Cálculo" value={form.baseCalculo} onChange={(v) => setForm({ ...form, baseCalculo: v })} opcoes={["percentual", "valor_fixo"]} />
          </div>
          <Input label="Nome *" value={form.nome} onChange={(v) => setForm({ ...form, nome: v })} required full />
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Descrição</label>
            <textarea
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:outline-none text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.ativo}
              onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
              className="w-4 h-4 rounded text-sky-600"
            />
            Ativo
          </label>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setAberto(false)} className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition">
              Cancelar
            </button>
            <button type="submit" className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-sm transition">
              Salvar
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
