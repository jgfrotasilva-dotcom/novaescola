import { NextRequest, NextResponse } from "next/server";
import { eq, asc, desc, and } from "drizzle-orm";
import { db } from "@/db";
import { servidorAts, servidores } from "@/db/schema";
import { obterSessao } from "@/lib/auth";

const DIAS_ENTRE_ATS = 1825; // 5 anos em dias

// Calcula a próxima vigência (vigência atual + 1825 dias)
function calcularProximaVigencia(dataVigencia: string): string {
  const d = new Date(dataVigencia + "T00:00:00");
  d.setDate(d.getDate() + DIAS_ENTRE_ATS);
  return d.toISOString().slice(0, 10);
}

// Verifica se servidor pode ter ATS (categoria A-Efetivo ou ACT-F)
function podeTerAts(categoria: string | null): boolean {
  if (!categoria) return true; // se não informado, permite
  const cat = categoria.trim().toUpperCase();
  return (
    cat.includes("EFETIV") ||
    cat.includes("A-EFETIVO") ||
    cat === "A" ||
    cat.includes("ACT") ||
    cat.includes("ACT-F") ||
    cat === "F"
  );
}

// ============================================================
// GET /api/vantagens-pessoais
// ?tipo=ats&servidorId=X -> lista ATS do servidor
// ?tipo=resumo&servidorId=X -> resumo (próximo, último, etc.)
// ============================================================
export async function GET(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const url = new URL(req.url);
  const tipo = url.searchParams.get("tipo");
  const servidorId = url.searchParams.get("servidorId");

  if (tipo === "ats" && servidorId) {
    const sid = Number(servidorId);
    if (sessao.papel === "servidor" && sessao.servidorId !== sid) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const [servidor] = await db.select().from(servidores).where(eq(servidores.id, sid)).limit(1);
    if (!servidor) return NextResponse.json({ error: "Servidor não encontrado" }, { status: 404 });

    const ats = await db
      .select()
      .from(servidorAts)
      .where(eq(servidorAts.servidorId, sid))
      .orderBy(asc(servidorAts.numero));

    // Identifica o último cadastrado
    const ultimo = ats.length > 0 ? ats[ats.length - 1] : null;

    return NextResponse.json({
      servidor: {
        id: servidor.id,
        nome: servidor.nomeCompleto,
        matricula: servidor.matricula,
        cargo: servidor.cargo,
        categoria: servidor.categoria,
        dataAdmissao: servidor.dataAdmissao,
        podeTerAts: podeTerAts(servidor.categoria),
      },
      ats,
      total: ats.length,
      ultimo,
      proximoNumero: ats.length + 1,
      proximaVigenciaSugerida: ultimo?.ehUltimo ? ultimo.proximaVigencia : null,
    });
  }

  // Lista de todos os servidores com resumo de ATS (para gestores)
  if (tipo === "resumo") {
    if (sessao.papel !== "gestor") {
      return NextResponse.json({ error: "Apenas gestores" }, { status: 403 });
    }

    const srvs = await db.select().from(servidores).orderBy(asc(servidores.nomeCompleto));
    const resultado = [];

    for (const s of srvs) {
      const ats = await db
        .select()
        .from(servidorAts)
        .where(eq(servidorAts.servidorId, s.id))
        .orderBy(asc(servidorAts.numero));

      const ultimo = ats.length > 0 ? ats[ats.length - 1] : null;
      const percentualTotal = ats.reduce(
        (acc, a) => acc + parseFloat(a.percentual || "0"),
        0
      );

      resultado.push({
        servidor: {
          id: s.id,
          nome: s.nomeCompleto,
          cargo: s.cargo,
          categoria: s.categoria,
          dataAdmissao: s.dataAdmissao,
          podeTerAts: podeTerAts(s.categoria),
        },
        totalAts: ats.length,
        percentualTotal: percentualTotal.toFixed(2),
        ultimoAts: ultimo
          ? {
              numero: ultimo.numero,
              dataVigencia: ultimo.dataVigencia,
              ehUltimo: ultimo.ehUltimo,
              proximaVigencia: ultimo.proximaVigencia,
            }
          : null,
      });
    }

    return NextResponse.json(resultado);
  }

  return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
}

// ============================================================
// POST - Cadastrar novo ATS
// ============================================================
export async function POST(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao || sessao.papel !== "gestor") {
    return NextResponse.json({ error: "Apenas gestores" }, { status: 403 });
  }

  const body = await req.json();
  const { servidorId, numero, dataVigencia, dataDoe, percentual, ehUltimo, observacao } = body;

  if (!servidorId || !numero || !dataVigencia) {
    return NextResponse.json({ error: "Campos obrigatórios: servidorId, numero, dataVigencia" }, { status: 400 });
  }

  // Verifica se servidor existe e pode ter ATS
  const [servidor] = await db.select().from(servidores).where(eq(servidores.id, Number(servidorId))).limit(1);
  if (!servidor) return NextResponse.json({ error: "Servidor não encontrado" }, { status: 404 });

  if (!podeTerAts(servidor.categoria)) {
    return NextResponse.json(
      { error: `Servidor com categoria "${servidor.categoria}" não pode receber ATS. Apenas A-Efetivo ou ACT-F.` },
      { status: 400 }
    );
  }

  // Verifica se já existe ATS com esse número
  const [existente] = await db
    .select()
    .from(servidorAts)
    .where(and(eq(servidorAts.servidorId, Number(servidorId)), eq(servidorAts.numero, Number(numero))))
    .limit(1);

  if (existente) {
    return NextResponse.json(
      { error: `Já existe o ${numero}º ATS cadastrado para este servidor.` },
      { status: 400 }
    );
  }

  // Calcula próxima vigência se for o último
  const proximaVigencia = ehUltimo ? calcularProximaVigencia(dataVigencia) : null;

  const [criado] = await db
    .insert(servidorAts)
    .values({
      servidorId: Number(servidorId),
      numero: Number(numero),
      dataVigencia,
      dataDoe: dataDoe || null,
      percentual: percentual || "5.00",
      ehUltimo: Boolean(ehUltimo),
      proximaVigencia,
      observacao: observacao || null,
    })
    .returning();

  return NextResponse.json(criado, { status: 201 });
}

// ============================================================
// PUT - Atualizar ATS existente (ex: marcar como "último")
// ============================================================
export async function PUT(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao || sessao.papel !== "gestor") {
    return NextResponse.json({ error: "Apenas gestores" }, { status: 403 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

  const body = await req.json();
  const updates: any = { ...body };

  // Recalcula próxima vigência se mudou ehUltimo ou dataVigencia
  if ("ehUltimo" in body || "dataVigencia" in body) {
    const [atual] = await db.select().from(servidorAts).where(eq(servidorAts.id, Number(id))).limit(1);
    if (atual) {
      const ehUltimo = "ehUltimo" in body ? body.ehUltimo : atual.ehUltimo;
      const dataVigencia = "dataVigencia" in body ? body.dataVigencia : atual.dataVigencia;
      updates.proximaVigencia = ehUltimo ? calcularProximaVigencia(dataVigencia) : null;
    }
  }

  const [atualizado] = await db
    .update(servidorAts)
    .set(updates)
    .where(eq(servidorAts.id, Number(id)))
    .returning();

  return NextResponse.json(atualizado);
}

// ============================================================
// DELETE - Excluir ATS
// ============================================================
export async function DELETE(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao || sessao.papel !== "gestor") {
    return NextResponse.json({ error: "Apenas gestores" }, { status: 403 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

  await db.delete(servidorAts).where(eq(servidorAts.id, Number(id)));
  return NextResponse.json({ ok: true });
}
