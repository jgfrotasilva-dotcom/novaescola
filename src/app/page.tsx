import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-sky-50">
      {/* Cabeçalho institucional */}
      <header className="no-print border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-600 to-indigo-700 flex items-center justify-center text-white font-bold shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-6 h-6">
              <path d="M3 21h18" />
              <path d="M5 21V10l7-5 7 5v11" />
              <path d="M9 21v-6h6v6" />
            </svg>
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-500 font-medium">Governo do Estado</p>
            <h1 className="text-base font-semibold text-slate-900 leading-tight">
              EE Profa. Marlene Frattini
            </h1>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-5xl w-full">
          <div className="text-center mb-14 animate-fade-in">
            <span className="inline-block px-3 py-1 text-xs font-semibold uppercase tracking-widest text-sky-700 bg-sky-100 rounded-full mb-4">
              Portal do Servidor
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 leading-tight">
              Vida Funcional <span className="text-sky-700">ao seu alcance</span>
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Consulte sua ficha funcional, vantagens adquiridas e histórico profissional
              de forma rápida, segura e organizada.
            </p>
          </div>

          {/* Cards de acesso */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* SERVIDOR */}
            <Link
              href="/login?papel=servidor"
              className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-8 shadow-sm hover:shadow-xl hover:border-sky-300 transition-all duration-300 animate-fade-in"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-sky-100 to-transparent rounded-full -mr-16 -mt-16 opacity-60 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="w-14 h-14 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-7 h-7">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Sou Servidor</h3>
                <p className="text-slate-600 mb-6">
                  Acesse sua ficha funcional completa, vantagens, histórico de carreira
                  e afastamentos. Visualize e imprima quando precisar.
                </p>
                <ul className="space-y-2 text-sm text-slate-600 mb-6">
                  <li className="flex items-center gap-2">
                    <CheckIcon /> Dados pessoais e funcionais
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon /> Vantagens adquiridas
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon /> Histórico e afastamentos
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon /> Impressão do relatório
                  </li>
                </ul>
                <div className="inline-flex items-center gap-2 text-sky-700 font-semibold group-hover:gap-3 transition-all">
                  Acessar
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                    <path d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>

            {/* GESTOR */}
            <Link
              href="/login?papel=gestor"
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white p-8 shadow-lg hover:shadow-2xl transition-all duration-300 animate-fade-in"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-sky-500/30 to-transparent rounded-full -mr-16 -mt-16 group-hover:scale-125 transition-transform duration-500" />
              <div className="relative">
                <div className="w-14 h-14 rounded-xl bg-white/10 backdrop-blur text-white flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-7 h-7">
                    <path d="M12 2 2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-2">Sou Gestor</h3>
                <p className="text-slate-300 mb-6">
                  Administre a ficha funcional de todos os servidores. Cadastre, edite,
                  exclua dados e vantagens com controle completo.
                </p>
                <ul className="space-y-2 text-sm text-slate-300 mb-6">
                  <li className="flex items-center gap-2">
                    <CheckIcon className="text-emerald-400" /> Gestão de todos os servidores
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon className="text-emerald-400" /> CRUD completo de dados
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon className="text-emerald-400" /> Catálogo de vantagens
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon className="text-emerald-400" /> Relatórios e histórico
                  </li>
                </ul>
                <div className="inline-flex items-center gap-2 text-sky-300 font-semibold group-hover:gap-3 transition-all">
                  Acessar painel
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                    <path d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          </div>

          {/* Credenciais de demonstração */}
          <div className="mt-10 mx-auto max-w-2xl rounded-xl border border-dashed border-slate-300 bg-white/60 p-5 text-sm no-print">
            <p className="text-slate-700 font-semibold mb-2 flex items-center gap-2">
              <span>🔑</span> Acesso demonstração
            </p>
            <div className="grid md:grid-cols-2 gap-3 text-slate-600">
              <div className="bg-white/80 rounded-lg p-3 border border-slate-200">
                <p className="font-semibold text-slate-900 mb-1">👨‍💼 Gestor</p>
                <p className="text-xs">Matrícula: <code className="px-1 py-0.5 bg-slate-100 rounded">GESTOR</code></p>
                <p className="text-xs">Senha: <code className="px-1 py-0.5 bg-slate-100 rounded">gestor123</code></p>
              </div>
              <div className="bg-white/80 rounded-lg p-3 border border-slate-200">
                <p className="font-semibold text-slate-900 mb-1">👩‍🏫 Servidora (Maria)</p>
                <p className="text-xs">CPF: <code className="px-1 py-0.5 bg-slate-100 rounded">123.456.789-00</code></p>
                <p className="text-xs">Nascimento: <code className="px-1 py-0.5 bg-slate-100 rounded">14051978</code> <span className="text-slate-400">(DDMMAAAA)</span></p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-200 text-xs">
              <Link href="/diagnostico" className="text-sky-700 hover:underline">
                🔍 Problemas para acessar? Execute o diagnóstico
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Rodapé */}
      <footer className="no-print border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-5 text-center text-sm text-slate-500">
          © {new Date().getFullYear()} EE Profa. Marlene Frattini · Portal do Servidor · Todos os direitos reservados
        </div>
      </footer>
    </main>
  );
}

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`w-4 h-4 text-emerald-600 ${className}`}>
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}
