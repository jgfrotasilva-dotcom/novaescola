import { NextRequest, NextResponse } from "next/server";
import { eq, asc, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { servidores } from "@/db/schema";
import { obterSessao } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  // Buscar um servidor específico
  if (id) {
    const [s] = await db.select().from(servidores).where(eq(servidores.id, Number(id))).limit(1);
    if (!s) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    // Servidor só pode ver seu próprio registro
    if (sessao.papel === "servidor" && sessao.servidorId !== s.id) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403});
    }
    return NextResponse.json(s);
  }

  // Gestor: lista todos (com busca opcional)
  if (sessao.papel === "gestor") {
    const busca = url.searchParams.get("q");
    let rows;
    if (busca) {
      rows = await db
        .select()
        .from(servidores)
        .where(or(ilike(servidores.nomeCompleto, `%${busca}%`), ilike(servidores.matricula, `%${busca}%`), ilike(servidores.cpf, `%${busca}%`)))
        .orderBy(asc(servidores.nomeCompleto));
    } else {
      rows = await db.select().from(servidores).orderBy(asc(servidores.nomeCompleto));
    }
    return NextResponse.json(rows);
  }

  // Servidor: apenas o próprio
  if (sessao.servidorId) {
    const rows = await db.select().from(servidores).where(eq(servidores.id, sessao.servidorId));
    return NextResponse.json(rows);
  }

  return NextResponse.json([]);
}

export async function POST(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao || sessao.papel !== "gestor") {
    return NextResponse.json({ error: "Apenas gestores podem cadastrar" }, { status: 403 });
  }
  const body = await req.json();
  const [criado] = await db.insert(servidores).values(body).returning();
  return NextResponse.json(criado, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao || sessao.papel !== "gestor") {
    return NextResponse.json({ error: "Apenas gestores podem editar" }, { status: 403 });
  }
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });
  const body = await req.json();
  const [atualizado] = await db
    .update(servidores)
    .set({ ...body, atualizadoEm: new Date() })
    .where(eq(servidores.id, Number(id)))
    .returning();
  return NextResponse.json(atualizado);
}

export async function DELETE(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao || sessao.papel !== "gestor") {
    return NextResponse.json({ error: "Apenas gestores podem excluir" }, { status: 403 });
  }
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });
  await db.delete(servidores).where(eq(servidores.id, Number(id)));
  return NextResponse.json({ ok: true });
}
