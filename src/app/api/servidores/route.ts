import { NextRequest, NextResponse } from "next/server";
import { eq, asc, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { servidores, users } from "@/db/schema";
import { obterSessao, hashSenha } from "@/lib/auth";

// Gera senha padrão baseada na data de nascimento (DDMMAAAA)
function gerarSenhaPadrao(dataNascimento: string | null): string {
  if (!dataNascimento) return "12345678";
  const [y, m, d] = dataNascimento.split("-");
  if (!y || !m || !d) return "12345678";
  return `${d}${m}${y}`;
}

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
  
  // Criar automaticamente um usuário para o servidor
  try {
    const senhaPadrao = gerarSenhaPadrao(criado.dataNascimento);
    const senhaHash = await hashSenha(senhaPadrao);
    
    await db.insert(users).values({
      matricula: criado.matricula,
      senhaHash,
      nome: criado.nomeCompleto,
      papel: "servidor",
      servidorId: criado.id,
      ativo: true,
    });
  } catch (err) {
    console.error("Erro ao criar usuário para servidor:", err);
    // Não falha o cadastro do servidor se a criação do usuário falhar
  }
  
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
  
  // Verificar se o servidor existe
  const [existe] = await db.select().from(servidores).where(eq(servidores.id, Number(id)));
  if (!existe) {
    return NextResponse.json({ error: "Servidor não encontrado" }, { status: 404 });
  }
  
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
  
  // Verificar se o servidor existe
  const [existe] = await db.select().from(servidores).where(eq(servidores.id, Number(id)));
  if (!existe) {
    return NextResponse.json({ error: "Servidor não encontrado" }, { status: 404 });
  }
  
  await db.delete(servidores).where(eq(servidores.id, Number(id)));
  return NextResponse.json({ ok: true });
}
