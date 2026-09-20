export function formatarData(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function formatarCPF(cpf: string): string {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return cpf;
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

export function formatarMoeda(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === "") return "—";
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (isNaN(n)) return "—";
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function calcularTempoServico(dataAdmissao: string): string {
  if (!dataAdmissao) return "—";
  const inicio = new Date(dataAdmissao + "T00:00:00");
  const agora = new Date();
  let anos = agora.getFullYear() - inicio.getFullYear();
  let meses = agora.getMonth() - inicio.getMonth();
  if (meses < 0) {
    anos--;
    meses += 12;
  }
  if (anos < 0) return "—";
  return `${anos} ano${anos !== 1 ? "s" : ""} e ${meses} mes${meses !== 1 ? "es" : ""}`;
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function situacaoCor(situacao: string): string {
  switch (situacao) {
    case "Ativo":
      return "bg-emerald-100 text-emerald-800 ring-emerald-200";
    case "Afastado":
      return "bg-amber-100 text-amber-800 ring-amber-200";
    case "Aposentado":
      return "bg-sky-100 text-sky-800 ring-sky-200";
    case "Exonerado":
      return "bg-rose-100 text-rose-800 ring-rose-200";
    default:
      return "bg-slate-100 text-slate-800 ring-slate-200";
  }
}
