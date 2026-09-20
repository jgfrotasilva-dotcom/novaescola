import { ReactNode } from "react";
import { cn } from "@/lib/format";

type Props = {
  titulo: string;
  subtitulo?: string;
  acao?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function Card({ titulo, subtitulo, acao, children, className }: Props) {
  return (
    <section className={cn("bg-white rounded-2xl shadow-sm border border-slate-200 print-card print-shadow-none", className)}>
      <header className="px-5 md:px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base md:text-lg font-bold text-slate-900 flex items-center gap-2">
            {titulo}
          </h2>
          {subtitulo && <p className="text-sm text-slate-500 mt-0.5">{subtitulo}</p>}
        </div>
        {acao && <div className="no-print">{acao}</div>}
      </header>
      <div className="px-5 md:px-6 py-5">{children}</div>
    </section>
  );
}

export function Campo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-1">{label}</dt>
      <dd className="text-sm text-slate-900 font-medium">{children ?? "—"}</dd>
    </div>
  );
}
