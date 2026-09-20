import { cookies } from "next/headers";

export type Sessao = {
  userId: number;
  matricula: string;
  nome: string;
  papel: "servidor" | "gestor";
  servidorId: number | null;
};

// Hash simples compatível com seed.ts
export async function hashSenha(senha: string) {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(senha + "::frattini"));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Cookie com formato: userId|matricula|nome|papel|servidorId
function codificar(sessao: Sessao): string {
  const payload = JSON.stringify(sessao);
  return Buffer.from(payload).toString("base64url");
}

function decodificar(token: string): Sessao | null {
  try {
    const payload = Buffer.from(token, "base64url").toString("utf8");
    return JSON.parse(payload) as Sessao;
  } catch {
    return null;
  }
}

export async function criarSessao(sessao: Sessao) {
  const cookieStore = await cookies();
  cookieStore.set({
    name: "frattini_sessao",
    value: codificar(sessao),
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 dias
  });
}

export async function obterSessao(): Promise<Sessao | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("frattini_sessao")?.value;
  if (!token) return null;
  return decodificar(token);
}

export async function limparSessao() {
  const cookieStore = await cookies();
  cookieStore.delete({ name: "frattini_sessao", path: "/" });
}
