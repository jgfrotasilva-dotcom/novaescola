import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { historicoFuncional, afastamentos } from "@/db/schema";
import { obterSessao } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const url = new URL(req.url);
  const servidorId = url.searchParams.get("servidorId");
  if (!servidorId) return NextResponse.json([]);
  const sid = Number(servidorId);
  if (sessao.papel === "servidor" && sessao.servidorId !== sid) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const historico = await db
    .select()
    .from(historicoFuncional)
    .where(eq(historicoFuncional.servidorId, sid))
    .orderBy(desc(historicoFuncional.dataOcorrencia));

  const afast = await db
    .select()
    .from(afastamentos)
    .where(eq(afastamentos.servidorId, sid))
    .orderBy(desc(afastamentos.dataInicio));

  return NextResponse.json({ historico, afastamentos: afast });
}

export async function POST(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao || sessao.papel !== "gestor") {
    return NextResponse.json({ error: "Apenas gestores" }, { status: 403 });
  }
  const url = new URL(req.url);
  const tipo = url.searchParams.get("tipo"); // 'historico' | 'afastamento'
  const body = await req.json();

  if (tipo === "historico") {
    const [criado] = await db.insert(historicoFuncional).values(body).returning();
    return NextResponse.json(criado, { status: 201 });
  }
  const [criado] = await db.insert(afastamentos).values(body).returning();
  return NextResponse.json(criado, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao || sessao.papel !== "gestor") {
    return NextResponse.json({ error: "Apenas gestores" }, { status: 403 });
  }
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const tipo = url.searchParams.get("tipo");
  if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

  if (tipo === "historico") {
    await db.delete(historicoFuncional).where(eq(historicoFuncional.id, Number(id)));
  } else {
    await db.delete(afastamentos).where(eq(afastamentos.id, Number(id)));
  }
  return NextResponse.json({ ok: true });
}
