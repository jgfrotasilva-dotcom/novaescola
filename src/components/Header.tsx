"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

type Props = {
  nome: string;
  papel: "servidor" | "gestor";
  voltarPara?: string;
};

export function Header({ nome, papel, voltarPara }: Props) {
  const router = useRouter();

  async function sair() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/");
  }

  return (
    <header className="no-print sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm print:hidden">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {voltarPara && (
            <Link
              href={voltarPara}
              className="hidden md:flex w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 items-center justify-center transition"
              title="Voltar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </Link>
          )}
          <Link href={papel === "gestor" ? "/gestor" : "/servidor"} className="flex items-center gap-2.5 min-w-0">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0 ${
              papel === "gestor" ? "bg-slate-900" : "bg-gradient-to-br from-sky-600 to-indigo-700"
            }`}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-5 h-5">
                <path d="M3 21h18" />
                <path d="M5 21V10l7-5 7 5v11" />
                <path d="M9 21v-6h6v6" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">EE Profa. Marlene Frattini</p>
              <p className="text-sm font-semibold text-slate-900 truncate">
                {papel === "gestor" ? "Painel do Gestor" : "Portal do Servidor"}
              </p>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium text-slate-900 truncate max-w-[200px]">{nome}</p>
            <p className="text-xs text-slate-500 capitalize">{papel}</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 text-white flex items-center justify-center text-sm font-bold">
            {nome.charAt(0).toUpperCase()}
          </div>
          <button
            onClick={sair}
            className="px-3 py-2 text-sm text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
            title="Sair"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="M16 17l5-5-5-5M21 12H9" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
