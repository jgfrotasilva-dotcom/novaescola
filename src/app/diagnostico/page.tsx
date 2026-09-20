"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function DiagnosticoPage() {
  const [dados, setDados] = useState<any>(null);
  const [carregando, setCarregando] = useState(true);
  const [testes, setTestes] = useState<Record<string, { ok: boolean; msg: string }>>({});

  useEffect(() => {
    async function rodar() {
      // Teste 1: API de diagnóstico
      try {
        const res = await fetch("/api/diagnostico");
        const data = await res.json();
        setDados(data);
        setTestes((t) => ({ ...t, diagnostico: { ok: true, msg: "API respondendo" } }));
      } catch (err) {
        setTestes((t) => ({ ...t, diagnostico: { ok: false, msg: (err as Error).message } }));
      }

      // Teste 2: Login POST
      try {
        const res = await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ matricula: "GESTOR", senha: "gestor123", papel: "gestor" }),
        });
        const data = await res.json();
        if (res.ok && data.ok) {
          setTestes((t) => ({ ...t, login: { ok: true, msg: `Logado como ${data.nome}` } }));
        } else {
          setTestes((t) => ({ ...t, login: { ok: false, msg: data.error || "Falha" } }));
        }
      } catch (err) {
        setTestes((t) => ({ ...t, login: { ok: false, msg: (err as Error).message } }));
      }

      // Teste 3: Cookie
      try {
        const res = await fetch("/api/auth");
        const data = await res.json();
        if (data.logado) {
          setTestes((t) => ({ ...t, cookie: { ok: true, msg: `Sessão ativa: ${data.nome}` } }));
        } else {
          setTestes((t) => ({ ...t, cookie: { ok: false, msg: "Cookie não foi salvo" } }));
        }
      } catch (err) {
        setTestes((t) => ({ ...t, cookie: { ok: false, msg: (err as Error).message } }));
      }

      // Teste 4: Sair
      try {
        await fetch("/api/auth", { method: "DELETE" });
        setTestes((t) => ({ ...t, logout: { ok: true, msg: "Logout OK" } }));
      } catch (err) {
        setTestes((t) => ({ ...t, logout: { ok: false, msg: (err as Error).message } }));
      }

      setCarregando(false);
    }
    rodar();
  }, []);

  const todosOk = Object.values(testes).every((t) => t.ok);

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-block mb-4 text-sm text-sky-700 hover:underline">
          ← Voltar ao início
        </Link>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">🔍 Diagnóstico do Sistema</h1>
          <p className="text-sm text-slate-600 mb-6">
            Esta página testa os componentes críticos do sistema para identificar problemas.
          </p>

          {carregando ? (
            <div className="py-12 text-center">
              <div className="w-12 h-12 mx-auto border-4 border-sky-600 border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-slate-600">Executando testes...</p>
            </div>
          ) : (
            <>
              <div className={`rounded-xl p-4 mb-6 ${todosOk ? "bg-emerald-50 border border-emerald-200" : "bg-amber-50 border border-amber-200"}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${todosOk ? "bg-emerald-500" : "bg-amber-500"} text-white`}>
                    {todosOk ? "✓" : "!"}
                  </div>
                  <div>
                    <h2 className="font-bold text-lg text-slate-900">
                      {todosOk ? "Todos os testes passaram!" : "Alguns testes falharam"}
                    </h2>
                    <p className="text-sm text-slate-600">
                      {todosOk
                        ? "O sistema está funcionando corretamente. Tente fazer login novamente."
                        : "Há um problema. Copie as informações abaixo e reporte."}
                    </p>
                  </div>
                </div>
              </div>

              <h3 className="font-bold text-slate-900 mb-3">Testes realizados</h3>
              <div className="space-y-2 mb-6">
                {Object.entries(testes).map(([nome, resultado]) => (
                  <div
                    key={nome}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      resultado.ok ? "bg-emerald-50" : "bg-rose-50"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${
                      resultado.ok ? "bg-emerald-500" : "bg-rose-500"
                    }`}>
                      {resultado.ok ? "✓" : "✗"}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900 capitalize">{nome}</p>
                      <p className="text-sm text-slate-600">{resultado.msg}</p>
                    </div>
                  </div>
                ))}
              </div>

              {dados && (
                <>
                  <h3 className="font-bold text-slate-900 mb-3">Informações do sistema</h3>
                  <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl text-xs overflow-x-auto">
                    {JSON.stringify(dados, null, 2)}
                  </pre>
                </>
              )}

              <div className="mt-6 pt-6 border-t border-slate-200 flex gap-2 flex-wrap">
                <button
                  onClick={() => window.location.reload()}
                  className="px-5 py-2.5 rounded-xl bg-sky-700 hover:bg-sky-800 text-white font-semibold transition"
                >
                  Testar novamente
                </button>
                <Link
                  href="/login"
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold transition"
                >
                  Ir para login
                </Link>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify({ testes, dados }, null, 2));
                    alert("Informações copiadas para a área de transferência!");
                  }}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition"
                >
                  Copiar diagnóstico
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
