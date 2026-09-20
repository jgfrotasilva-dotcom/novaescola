"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { formatarData, formatarCPF } from "@/lib/format";

type RelatorioGeral = {
  tipo: "geral";
  titulo: string;
  total: number;
  data: string;
  servidores: any[];
};

type RelatorioGrupo = {
  tipo: "cargo" | "categoria";
  titulo: string;
  total: number;
  totalCargos?: number;
  totalCategorias?: number;
  data: string;
  grupos: {
    cargo?: string;
    categoria?: string;
    total: number;
    servidores: any[];
  }[];
};

export default function RelatoriosPage() {
  const router = useRouter();
  const [sessao, setSessao] = useState<any>(null);
  const [tipoRelatorio, setTipoRelatorio] = useState<"geral" | "cargo" | "categoria">("geral");
  const [relatorio, setRelatorio] = useState<RelatorioGeral | RelatorioGrupo | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [modoImpressao, setModoImpressao] = useState(false);

  useEffect(() => {
    async function carregar() {
      const auth = await (await fetch("/api/auth")).json();
      if (!auth.logado || auth.papel !== "gestor") {
        router.replace("/login?papel=gestor");
        return;
      }
      setSessao(auth);
    }
    carregar();
  }, [router]);

  async function gerarRelatorio() {
    setCarregando(true);
    try {
      const res = await fetch(`/api/relatorios?tipo=${tipoRelatorio}`);
      const data = await res.json();
      setRelatorio(data);
      setModoImpressao(true);
    } catch (err) {
      console.error("Erro ao gerar relatório:", err);
      alert("Erro ao gerar relatório");
    } finally {
      setCarregando(false);
    }
  }

  function imprimir() {
    window.print();
  }

  function voltar() {
    setModoImpressao(false);
    setRelatorio(null);
  }

  if (!sessao) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-slate-700 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Modo impressão
  if (modoImpressao && relatorio) {
    return (
      <>
        <style jsx global>{`
          @media print {
            body * {
              visibility: hidden;
            }
            .print-area, .print-area * {
              visibility: visible;
            }
            .print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            .no-print {
              display: none !important;
            }
            .page-break {
              page-break-after: always;
            }
          }
        `}</style>

        <div className="no-print fixed top-4 right-4 z-50 flex gap-2">
          <button
            onClick={imprimir}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg"
          >
            🖨️ Imprimir
          </button>
          <button
            onClick={voltar}
            className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 shadow-lg"
          >
            ← Voltar
          </button>
        </div>

        <div className="print-area bg-white p-8 max-w-6xl mx-auto">
          <RelatorioView relatorio={relatorio} />
        </div>
      </>
    );
  }

  // Modo seleção
  return (
    <div className="min-h-screen bg-slate-50">
      <Header nome={sessao.nome} papel="gestor" voltarPara="/gestor" />

      <main className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
            📊 Relatórios de Servidores
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Gere relatórios profissionais para impressão
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              Tipo de Relatório
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                onClick={() => setTipoRelatorio("geral")}
                className={`p-4 rounded-lg border-2 transition ${
                  tipoRelatorio === "geral"
                    ? "border-blue-600 bg-blue-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="text-2xl mb-2">📋</div>
                <div className="font-semibold text-slate-900">Geral</div>
                <div className="text-xs text-slate-600 mt-1">
                  Lista completa de todos os servidores
                </div>
              </button>

              <button
                onClick={() => setTipoRelatorio("cargo")}
                className={`p-4 rounded-lg border-2 transition ${
                  tipoRelatorio === "cargo"
                    ? "border-blue-600 bg-blue-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="text-2xl mb-2">💼</div>
                <div className="font-semibold text-slate-900">Por Cargo</div>
                <div className="text-xs text-slate-600 mt-1">
                  Agrupado por cargo funcional
                </div>
              </button>

              <button
                onClick={() => setTipoRelatorio("categoria")}
                className={`p-4 rounded-lg border-2 transition ${
                  tipoRelatorio === "categoria"
                    ? "border-blue-600 bg-blue-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="text-2xl mb-2">🏷️</div>
                <div className="font-semibold text-slate-900">Por Categoria</div>
                <div className="text-xs text-slate-600 mt-1">
                  Agrupado por categoria (A-Efetivo, ACT-F, etc)
                </div>
              </button>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={gerarRelatorio}
              disabled={carregando}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold"
            >
              {carregando ? "Gerando..." : "Gerar Relatório"}
            </button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">💡 Dicas:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
              <li>O relatório será exibido em formato otimizado para impressão</li>
              <li>Use Ctrl+P (ou Cmd+P no Mac) para imprimir ou salvar como PDF</li>
              <li>Os relatórios são gerados em tempo real com dados atualizados</li>
              <li>Layout profissional sem elementos gráficos, apenas tabelas</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}

// Componente de visualização do relatório
function RelatorioView({ relatorio }: { relatorio: RelatorioGeral | RelatorioGrupo }) {
  const dataFormatada = new Date(relatorio.data).toLocaleString("pt-BR");

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="border-b-2 border-slate-900 pb-4">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">
          EE Profa. Marlene Frattini
        </h1>
        <h2 className="text-xl font-semibold text-slate-700">
          {relatorio.titulo}
        </h2>
        <div className="mt-2 text-sm text-slate-600 space-y-1">
          <p>Data de geração: {dataFormatada}</p>
          <p>Total de servidores: {relatorio.total}</p>
          {relatorio.tipo === "cargo" && (
            <p>Total de cargos: {(relatorio as RelatorioGrupo).totalCargos}</p>
          )}
          {relatorio.tipo === "categoria" && (
            <p>Total de categorias: {(relatorio as RelatorioGrupo).totalCategorias}</p>
          )}
        </div>
      </div>

      {/* Conteúdo */}
      {relatorio.tipo === "geral" && (
        <RelatorioGeralView relatorio={relatorio as RelatorioGeral} />
      )}

      {relatorio.tipo === "cargo" && (
        <RelatorioGrupoView relatorio={relatorio as RelatorioGrupo} tipoGrupo="cargo" />
      )}

      {relatorio.tipo === "categoria" && (
        <RelatorioGrupoView relatorio={relatorio as RelatorioGrupo} tipoGrupo="categoria" />
      )}

      {/* Rodapé */}
      <div className="border-t-2 border-slate-900 pt-4 mt-8 text-xs text-slate-600 text-center">
        <p>Documento gerado automaticamente pelo Sistema de Gestão de Servidores</p>
        <p>EE Profa. Marlene Frattini - {new Date().getFullYear()}</p>
      </div>
    </div>
  );
}

// Relatório geral
function RelatorioGeralView({ relatorio }: { relatorio: RelatorioGeral }) {
  return (
    <div>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-slate-100 border-b-2 border-slate-900">
            <th className="text-left p-2 font-semibold">#</th>
            <th className="text-left p-2 font-semibold">Nome Completo</th>
            <th className="text-left p-2 font-semibold">CPF</th>
            <th className="text-left p-2 font-semibold">Matrícula</th>
            <th className="text-left p-2 font-semibold">Cargo</th>
            <th className="text-left p-2 font-semibold">Categoria</th>
            <th className="text-left p-2 font-semibold">Nível</th>
            <th className="text-left p-2 font-semibold">Admissão</th>
          </tr>
        </thead>
        <tbody>
          {relatorio.servidores.map((s, i) => (
            <tr key={s.id} className="border-b border-slate-300">
              <td className="p-2">{i + 1}</td>
              <td className="p-2 font-medium">{s.nomeCompleto}</td>
              <td className="p-2 font-mono text-xs">{formatarCPF(s.cpf)}</td>
              <td className="p-2 font-mono text-xs">{s.matricula}</td>
              <td className="p-2">{s.cargo}</td>
              <td className="p-2">{s.categoria || "-"}</td>
              <td className="p-2">{s.nivel || "-"}</td>
              <td className="p-2">{formatarData(s.dataAdmissao)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Relatório agrupado
function RelatorioGrupoView({
  relatorio,
  tipoGrupo,
}: {
  relatorio: RelatorioGrupo;
  tipoGrupo: "cargo" | "categoria";
}) {
  return (
    <div className="space-y-6">
      {relatorio.grupos.map((grupo, idx) => (
        <div key={idx} className={idx > 0 ? "page-break" : ""}>
          <div className="bg-slate-100 p-3 border-l-4 border-slate-900 mb-3">
            <h3 className="text-lg font-bold text-slate-900">
              {tipoGrupo === "cargo" ? grupo.cargo : grupo.categoria}
            </h3>
            <p className="text-sm text-slate-600">
              Total: {grupo.total} {grupo.total === 1 ? "servidor" : "servidores"}
            </p>
          </div>

          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b-2 border-slate-700">
                <th className="text-left p-2 font-semibold">#</th>
                <th className="text-left p-2 font-semibold">Nome Completo</th>
                <th className="text-left p-2 font-semibold">CPF</th>
                <th className="text-left p-2 font-semibold">Matrícula</th>
                {tipoGrupo === "cargo" && (
                  <th className="text-left p-2 font-semibold">Categoria</th>
                )}
                {tipoGrupo === "categoria" && (
                  <th className="text-left p-2 font-semibold">Cargo</th>
                )}
                <th className="text-left p-2 font-semibold">Nível</th>
                <th className="text-left p-2 font-semibold">Admissão</th>
              </tr>
            </thead>
            <tbody>
              {grupo.servidores.map((s, i) => (
                <tr key={s.id} className="border-b border-slate-300">
                  <td className="p-2">{i + 1}</td>
                  <td className="p-2 font-medium">{s.nomeCompleto}</td>
                  <td className="p-2 font-mono text-xs">{formatarCPF(s.cpf)}</td>
                  <td className="p-2 font-mono text-xs">{s.matricula}</td>
                  {tipoGrupo === "cargo" && (
                    <td className="p-2">{s.categoria || "-"}</td>
                  )}
                  {tipoGrupo === "categoria" && (
                    <td className="p-2">{s.cargo}</td>
                  )}
                  <td className="p-2">{s.nivel || "-"}</td>
                  <td className="p-2">{formatarData(s.dataAdmissao)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
