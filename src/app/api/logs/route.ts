import { NextRequest, NextResponse } from "next/server";
import { obterSessao } from "@/lib/auth";

// Armazena logs em memória (últimos 100)
const logs: string[] = [];
const MAX_LOGS = 100;

export function addLog(message: string) {
  const timestamp = new Date().toISOString();
  const log = `[${timestamp}] ${message}`;
  logs.push(log);
  if (logs.length > MAX_LOGS) {
    logs.shift();
  }
  console.log(log);
}

export async function GET(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao || sessao.papel !== "gestor") {
    return NextResponse.json({ error: "Apenas gestores" }, { status: 403 });
  }

  return NextResponse.json({
    logs: logs.slice(-50),
    total: logs.length,
    timestamp: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao || sessao.papel !== "gestor") {
    return NextResponse.json({ error: "Apenas gestores" }, { status: 403 });
  }

  // Limpa logs
  logs.length = 0;
  return NextResponse.json({ ok: true, message: "Logs limpos" });
}
