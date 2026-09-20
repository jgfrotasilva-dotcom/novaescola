import { NextRequest, NextResponse } from "next/server";
import { eq, asc, desc, and } from "drizzle-orm";
import { db } from "@/db";
import {
  servidorVantagens,
  tiposVantagem,
  historicoFuncional,
  afastamentos,
} from "@/db/schema";
import { obterSessao } from "@/lib/auth";

// ============================================================
// /api/vantagens
// ============================================================
export async function GET(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const url = new URL(req.url);
  const servidorId = url.searchParams.get("servidorId");
  const catalogo = url.searchParams.get("catalogo");

  // Catálogo de tipos de vantagem
  if (catalogo === "1") {
    const rows = await db.select().from(tiposVantagem).orderBy(asc(tiposVantagem.nome));
    return NextResponse.json(rows);
  }

  // Vantagens de um servidor (com join de tipo)
  if (servidorId) {
    const sid = Number(servidorId);
    if (sessao.papel === "servidor" && sessao.servidorId !== sid) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    const rows = await db
      .select({
        id: servidorVantagens.id,
        tipoVantagemId: servidorVantagens.tipoVantagemId,
        tipoNome: tiposVantagem.nome,
        tipoCodigo: tiposVantagem.codigo,
        tipoBaseCalculo: tiposVantagem.baseCalculo,
        percentual: servidorVantagens.percentual,
        valorFixo: servidorVantagens.valorFixo,
        dataInicio: servidorVantagens.dataInicio,
        dataFim: servidorVantagens.dataFim,
        fundamentoLegal: servidorVantagens.fundamentoLegal,
        observacao: servidorVantagens.observacao,
      })
      .from(servidorVantagens)
      .innerJoin(tiposVantagem, eq(servidorVantagens.tipoVantagemId, tiposVantagem.id))
      .where(eq(servidorVantagens.servidorId, sid))
      .orderBy(desc(servidorVantagens.dataInicio));
    return NextResponse.json(rows);
  }

  return NextResponse.json([]);
}

export async function POST(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao || sessao.papel !== "gestor") {
    return NextResponse.json({ error: "Apenas gestores" }, { status: 403 });
  }
  const url = new URL(req.url);
  const tipo = url.searchParams.get("tipo"); // 'catalogo' | 'atribuir'

  const body = await req.json();

  if (tipo === "catalogo") {
    const [criado] = await db.insert(tiposVantagem).values(body).returning();
    return NextResponse.json(criado, { status: 201 });
  }

  // Atribuir vantagem ao servidor
  const [criado] = await db.insert(servidorVantagens).values(body).returning();
  return NextResponse.json(criado, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao || sessao.papel !== "gestor") {
    return NextResponse.json({ error: "Apenas gestores" }, { status: 403 });
  }
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const tipo = url.searchParams.get("tipo");
  if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });
  const body = await req.json();

  if (tipo === "catalogo") {
    const [atualizado] = await db
      .update(tiposVantagem)
      .set(body)
      .where(eq(tiposVantagem.id, Number(id)))
      .returning();
    return NextResponse.json(atualizado);
  }
  const [atualizado] = await db
    .update(servidorVantagens)
    .set(body)
    .where(eq(servidorVantagens.id, Number(id)))
    .returning();
  return NextResponse.json(atualizado);
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

  if (tipo === "catalogo") {
    await db.delete(tiposVantagem).where(eq(tiposVantagem.id, Number(id)));
  } else {
    await db.delete(servidorVantagens).where(eq(servidorVantagens.id, Number(id)));
  }
  return NextResponse.json({ ok: true });
}
