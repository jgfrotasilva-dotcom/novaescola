"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";

export default function LogsPage() {
  const router = useRouter();
  const [sessao, setSessao] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(false);

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

  async function carregarLogs() {
    setCarregando(true);
    try {
      const res = await fetch("/api/logs");
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err) {
      console.error("Erro ao carregar logs:", err);
    } finally {
      setCarregando(false);
    }
  }

  async function limparLogs() {
    await fetch("/api/logs", { method: "POST" });
    setLogs([]);
  }

  useEffect(() => {
    if (sessao) {
      carregarLogs();
      const interval = setInterval(carregarLogs, 3000);
      return () => clearInterval(interval);
    }
  }, [sessao]);

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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
              🔍 Logs do Servidor
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Visualize os logs em tempo real para diagnosticar problemas
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={carregarLogs}
              disabled={carregando}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {carregando ? "Carregando..." : "Atualizar"}
            </button>
            <button
              onClick={limparLogs}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Limpar Logs
            </button>
          </div>
        </div>

        <div className="bg-slate-900 rounded-lg p-4 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <p className="text-slate-400 text-sm">
              Total: {logs.length} logs
            </p>
            <p className="text-slate-400 text-xs">
              Atualização automática a cada 3s
            </p>
          </div>
          <div className="bg-black rounded p-4 h-[600px] overflow-y-auto font-mono text-sm">
            {logs.length === 0 ? (
              <p className="text-slate-500">Nenhum log registrado ainda...</p>
            ) : (
              logs.map((log, i) => (
                <div
                  key={i}
                  className={`mb-1 ${
                    log.includes("ERRO") || log.includes("Erro")
                      ? "text-red-400"
                      : log.includes("Sucesso")
                      ? "text-green-400"
                      : "text-slate-300"
                  }`}
                >
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">💡 Como usar:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
            <li>Deixe esta página aberta</li>
            <li>Em outra aba, tente cadastrar uma evolução funcional</li>
            <li>Volte aqui e veja os logs atualizados automaticamente</li>
            <li>Se houver erro 500, os detalhes aparecerão em vermelho</li>
          </ol>
        </div>
      </main>
    </div>
  );
}
