"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const papelParam = searchParams.get("papel") || "servidor";
  const [papel, setPapel] = useState<"servidor" | "gestor">(
    papelParam === "gestor" ? "gestor" : "servidor"
  );
  const [matricula, setMatricula] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    setPapel(papelParam === "gestor" ? "gestor" : "servidor");
  }, [papelParam]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setCarregando(true);
    try {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 15000);
      const matriculaFormatada = papel === "gestor"
        ? matricula.trim().toUpperCase()
        : matricula.trim(); // CPF - não converte para uppercase
      const senhaFormatada = papel === "gestor" ? senha : senha.replace(/\D/g, ""); // só dígitos

      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matricula: matriculaFormatada, senha: senhaFormatada, papel }),
        signal: ctrl.signal,
      });
      clearTimeout(timeout);

      const data = await res.json();
      if (!res.ok) {
        setErro(data.error || "Credenciais inválidas.");
        setCarregando(false);
        return;
      }

      // Pequeno delay para garantir que o cookie foi processado
      await new Promise((r) => setTimeout(r, 200));

      // Navega substituindo o histórico para não voltar ao login
      router.replace(papel === "gestor" ? "/gestor" : "/servidor");
    } catch (err) {
      const msg = (err as Error).name === "AbortError"
        ? "Tempo esgotado. O servidor demorou para responder. Tente novamente."
        : "Não foi possível conectar ao servidor. Verifique sua conexão.";
      setErro(msg);
      setCarregando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Toggle de papel */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
        <button
          type="button"
          onClick={() => setPapel("servidor")}
          className={`py-2.5 text-sm font-semibold rounded-lg transition-all ${
            papel === "servidor"
              ? "bg-white text-sky-700 shadow"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Servidor
        </button>
        <button
          type="button"
          onClick={() => setPapel("gestor")}
          className={`py-2.5 text-sm font-semibold rounded-lg transition-all ${
            papel === "gestor"
              ? "bg-slate-900 text-white shadow"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Gestor
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          {papel === "gestor" ? "Matrícula" : "CPF"}
        </label>
        <input
          type={papel === "gestor" ? "text" : "text"}
          inputMode={papel === "gestor" ? "text" : "numeric"}
          value={matricula}
          onChange={(e) => setMatricula(e.target.value)}
          placeholder={papel === "gestor" ? "Ex: GESTOR" : "000.000.000-00"}
          required
          autoFocus
          className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
        />
        {papel === "servidor" && (
          <p className="text-xs text-slate-500 mt-1">Informe seu CPF (com ou sem pontuação)</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          {papel === "gestor" ? "Senha" : "Data de Nascimento"}
        </label>
        <input
          type={papel === "gestor" ? "password" : "text"}
          inputMode={papel === "gestor" ? undefined : "numeric"}
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          placeholder={papel === "gestor" ? "••••••••" : "DDMMAAAA"}
          maxLength={papel === "gestor" ? undefined : 8}
          required
          className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
        />
        {papel === "servidor" && (
          <p className="text-xs text-slate-500 mt-1">
            Use sua data de nascimento no formato <strong>DDMMAAAA</strong> (ex: 14051978)
          </p>
        )}
      </div>

      {erro && (
        <div className="px-4 py-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl animate-fade-in">
          {erro}
        </div>
      )}

      <button
        type="submit"
        disabled={carregando || !matricula || !senha}
        className={`w-full py-3 rounded-xl font-semibold text-white shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
          papel === "gestor"
            ? "bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700"
            : "bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700"
        }`}
      >
        {carregando ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Entrando...
          </>
        ) : (
          <>
            Entrar
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </>
        )}
      </button>

      <p className="text-xs text-slate-500 text-center">
        Problemas para acessar? Procure a secretaria da escola.
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-white to-sky-50 px-6 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 animate-fade-in">
          <Link href="/" className="inline-block">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-sky-600 to-indigo-700 flex items-center justify-center text-white shadow-lg mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-7 h-7">
                <path d="M3 21h18" />
                <path d="M5 21V10l7-5 7 5v11" />
                <path d="M9 21v-6h6v6" />
              </svg>
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Acesso ao Sistema</h1>
          <p className="text-sm text-slate-600 mt-1">
            EE Profa. Marlene Frattini · Portal do Servidor
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-7 border border-slate-200">
          <Suspense fallback={<div>Carregando...</div>}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6 space-x-3">
          <Link href="/" className="hover:text-sky-700 transition">
            ← Voltar
          </Link>
          <span className="text-slate-300">|</span>
          <Link href="/diagnostico" className="hover:text-sky-700 transition">
            🔍 Diagnóstico
          </Link>
        </p>

        <noscript>
          <div className="mt-4 bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-sm text-center">
            ⚠️ <strong>JavaScript está desabilitado.</strong> Este sistema requer JavaScript para funcionar. Por favor, habilite-o nas configurações do seu navegador.
          </div>
        </noscript>
      </div>
    </main>
  );
}
