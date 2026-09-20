import { NextRequest, NextResponse } from "next/server";
import { eq, asc, desc, and } from "drizzle-orm";
import { db } from "@/db";
import { evolucaoFuncional, servidores } from "@/db/schema";
import { obterSessao } from "@/lib/auth";

// ============================================================
// REGRAS DE EVOLUÇÃO (apenas interstício)
// ============================================================
type Regra = {
  nivelOrigem: string;
  nivelDestino: string;
  intersticioAnos: number;
};

const REGRAS_DOCENTE: Regra[] = [
  { nivelOrigem: "I", nivelDestino: "II", intersticioAnos: 4 },
  { nivelOrigem: "II", nivelDestino: "III", intersticioAnos: 4 },
  { nivelOrigem: "III", nivelDestino: "IV", intersticioAnos: 5 },
  { nivelOrigem: "IV", nivelDestino: "V", intersticioAnos: 5 },
  { nivelOrigem: "V", nivelDestino: "VI", intersticioAnos: 4 },
  { nivelOrigem: "VI", nivelDestino: "VII", intersticioAnos: 4 },
  { nivelOrigem: "VII", nivelDestino: "VIII", intersticioAnos: 4 },
];

const REGRAS_DIRETOR: Regra[] = [
  { nivelOrigem: "I", nivelDestino: "II", intersticioAnos: 4 },
  { nivelOrigem: "II", nivelDestino: "III", intersticioAnos: 5 },
  { nivelOrigem: "III", nivelDestino: "IV", intersticioAnos: 6 },
  { nivelOrigem: "IV", nivelDestino: "V", intersticioAnos: 6 },
  { nivelOrigem: "V", nivelDestino: "VI", intersticioAnos: 5 },
  { nivelOrigem: "VI", nivelDestino: "VII", intersticioAnos: 5 },
  { nivelOrigem: "VII", nivelDestino: "VIII", intersticioAnos: 4 },
];

// Detecta se cargo é elegível e qual tabela de regras usar
function analisarCargo(cargo: string | null): {
  elegivel: boolean;
  tipoRegra: "DOCENTE" | "DIRETOR" | null;
  motivo?: string;
} {
  if (!cargo) return { elegivel: false, tipoRegra: null, motivo: "Cargo não informado" };
  const c = cargo
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (c.includes("DIRETOR")) return { elegivel: true, tipoRegra: "DIRETOR" };
  if (
    c.includes("PEB I") ||
    c.includes("PEB II") ||
    c.includes("PROFESSOR DE EDUCACAO BASICA") ||
    c.includes("PROFESSOR DE EDUCA") ||
    (c.includes("PROFESSOR") && (c.includes("BASICA I") || c.includes("BASICA II")))
  ) {
    return { elegivel: true, tipoRegra: "DOCENTE" };
  }
  return { elegivel: false, tipoRegra: null, motivo: `Cargo "${cargo}" não elegível (apenas PEB I, PEB II ou Diretor)` };
}

function podeEvoluir(categoria: string | null): boolean {
  if (!categoria) return true;
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

function getRegra(tipo: "DOCENTE" | "DIRETOR", origem: string, destino: string): Regra | null {
  const tabela = tipo === "DIRETOR" ? REGRAS_DIRETOR : REGRAS_DOCENTE;
  return tabela.find((r) => r.nivelOrigem === origem && r.nivelDestino === destino) || null;
}

function adicionarAnos(data: string, anos: number): string {
  const d = new Date(data + "T00:00:00");
  d.setFullYear(d.getFullYear() + anos);
  return d.toISOString().slice(0, 10);
}

// ============================================================
// GET
// ============================================================
export async function GET(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const url = new URL(req.url);
  const tipo = url.searchParams.get("tipo");
  const servidorId = url.searchParams.get("servidorId");

  if (tipo === "regras") {
    return NextResponse.json({
      DOCENTE: REGRAS_DOCENTE,
      DIRETOR: REGRAS_DIRETOR,
    });
  }

  if (tipo === "evolucoes" && servidorId) {
    const sid = Number(servidorId);
    if (sessao.papel === "servidor" && sessao.servidorId !== sid) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const [servidor] = await db.select().from(servidores).where(eq(servidores.id, sid)).limit(1);
    if (!servidor) return NextResponse.json({ error: "Servidor não encontrado" }, { status: 404 });

    const analiseCargo = analisarCargo(servidor.cargo);
    const elegivelCategoria = podeEvoluir(servidor.categoria);

    const evs = await db
      .select()
      .from(evolucaoFuncional)
      .where(eq(evolucaoFuncional.servidorId, sid))
      .orderBy(asc(evolucaoFuncional.numero));

    // Identifica a última evolução marcada como "ehUltima"
    const ultima = evs.find((e) => e.ehUltima) || (evs.length > 0 ? evs[evs.length - 1] : null);

    // Sugere próxima transição baseada na última evolução marcada
    let proximaRegra: Regra | null = null;
    let proximaDataSugerida: string | null = null;

    if (analiseCargo.tipoRegra && ultima) {
      const tabela = analiseCargo.tipoRegra === "DIRETOR" ? REGRAS_DIRETOR : REGRAS_DOCENTE;
      const proxima = tabela.find((r) => r.nivelOrigem === ultima.nivelPosterior);
      if (proxima) {
        proximaRegra = proxima;
        // Calcula a partir da vigência da última evolução marcada
        proximaDataSugerida = adicionarAnos(ultima.dataVigencia, proxima.intersticioAnos);
      }
    } else if (analiseCargo.tipoRegra && evs.length === 0) {
      // Primeira evolução - baseada no nível atual e data de admissão
      const tabela = analiseCargo.tipoRegra === "DIRETOR" ? REGRAS_DIRETOR : REGRAS_DOCENTE;
      const primeira = tabela.find((r) => r.nivelOrigem === (servidor.nivel || "I"));
      if (primeira) {
        proximaRegra = primeira;
        proximaDataSugerida = adicionarAnos(servidor.dataAdmissao, primeira.intersticioAnos);
      }
    }

    return NextResponse.json({
      servidor: {
        id: servidor.id,
        nome: servidor.nomeCompleto,
        matricula: servidor.matricula,
        cargo: servidor.cargo,
        categoria: servidor.categoria,
        nivel: servidor.nivel,
        dataAdmissao: servidor.dataAdmissao,
        elegivelCargo: analiseCargo.elegivel,
        elegivelCategoria,
        motivoInelegibilidade: !analiseCargo.elegivel ? analiseCargo.motivo : !elegivelCategoria ? "Categoria não elegível (apenas A-Efetivo ou ACT-F)" : null,
        tipoRegra: analiseCargo.tipoRegra,
      },
      evolucoes: evs,
      total: evs.length,
      ultima,
      proximaRegra,
      proximaDataSugerida,
    });
  }

  return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
}

// ============================================================
// POST - Cadastrar evolução
// ============================================================
export async function POST(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao || sessao.papel !== "gestor") {
    return NextResponse.json({ error: "Apenas gestores" }, { status: 403 });
  }

  const body = await req.json();
  const {
    servidorId,
    nivelAnterior,
    nivelPosterior,
    dataVigencia,
    dataDoe,
    ehUltima,
    dataEfetiva,
    intervencao,
    justificativa,
  } = body;

  if (!servidorId || !nivelAnterior || !nivelPosterior || !dataVigencia) {
    return NextResponse.json(
      { error: "Campos obrigatórios: servidorId, nivelAnterior, nivelPosterior, dataVigencia" },
      { status: 400 }
    );
  }

  // Valida servidor
  const [servidor] = await db.select().from(servidores).where(eq(servidores.id, Number(servidorId))).limit(1);
  if (!servidor) return NextResponse.json({ error: "Servidor não encontrado" }, { status: 404 });

  const analiseCargo = analisarCargo(servidor.cargo);
  if (!analiseCargo.elegivel || !analiseCargo.tipoRegra) {
    return NextResponse.json(
      { error: analiseCargo.motivo || "Cargo não elegível" },
      { status: 400 }
    );
  }

  if (!podeEvoluir(servidor.categoria)) {
    return NextResponse.json(
      { error: `Categoria "${servidor.categoria}" não elegível (apenas A-Efetivo ou ACT-F)` },
      { status: 400 }
    );
  }

  // Busca regra para a transição
  const regra = getRegra(analiseCargo.tipoRegra, nivelAnterior, nivelPosterior);
  if (!regra) {
    return NextResponse.json(
      { error: `Transição ${nivelAnterior} → ${nivelPosterior} não existe na tabela de regras.` },
      { status: 400 }
    );
  }

  // Verifica duplicata de número
  const existentes = await db
    .select()
    .from(evolucaoFuncional)
    .where(eq(evolucaoFuncional.servidorId, Number(servidorId)))
    .orderBy(asc(evolucaoFuncional.numero));

  const numero = existentes.length + 1;
  const ultima = existentes.length > 0 ? existentes[existentes.length - 1] : null;

  // Se ehUltima = true, calcula a próxima data
  const tabela = analiseCargo.tipoRegra === "DIRETOR" ? REGRAS_DIRETOR : REGRAS_DOCENTE;
  const proximaRegra = tabela.find((r) => r.nivelOrigem === nivelPosterior);
  const proximaData = ehUltima && proximaRegra ? adicionarAnos(dataVigencia, proximaRegra.intersticioAnos) : null;

  // Data calculada (baseada na evolução anterior)
  const dataCalculada = ultima ? adicionarAnos(ultima.dataVigencia, regra.intersticioAnos) : null;

  // Se esta evolução for marcada como "última", desmarca as outras
  if (ehUltima) {
    await db
      .update(evolucaoFuncional)
      .set({ ehUltima: false, proximaData: null })
      .where(eq(evolucaoFuncional.servidorId, Number(servidorId)));
  }

  const [criada] = await db
    .insert(evolucaoFuncional)
    .values({
      servidorId: Number(servidorId),
      numero,
      nivelAnterior,
      nivelPosterior,
      dataVigencia,
      dataDoe: dataDoe || null,
      ehUltima: Boolean(ehUltima),
      intersticioAnos: regra.intersticioAnos,
      ultimaEvolucao: ultima?.dataVigencia || null,
      proximaData,
      dataCalculada,
      dataEfetiva: dataEfetiva || null,
      intervencao: intervencao || null,
      justificativa: justificativa || null,
      responsavel: sessao.nome,
    })
    .returning();

  // Atualiza o nível do servidor
  await db
    .update(servidores)
    .set({ nivel: nivelPosterior })
    .where(eq(servidores.id, Number(servidorId)));

  return NextResponse.json(criada, { status: 201 });
}

// ============================================================
// PUT - Atualizar evolução (ex: marcar/desmarcar como última)
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

  // Busca a evolução atual
  const [evolucao] = await db.select().from(evolucaoFuncional).where(eq(evolucaoFuncional.id, Number(id))).limit(1);
  if (!evolucao) return NextResponse.json({ error: "Evolução não encontrada" }, { status: 404 });

  const updates: any = { ...body };

  // Se vai marcar como última, recalcula a próxima data e desmarca as outras
  if (body.ehUltima === true) {
    // Busca servidor para saber a regra
    const [servidor] = await db.select().from(servidores).where(eq(servidores.id, evolucao.servidorId)).limit(1);
    if (servidor) {
      const analise = analisarCargo(servidor.cargo);
      if (analise.tipoRegra) {
        const tabela = analise.tipoRegra === "DIRETOR" ? REGRAS_DIRETOR : REGRAS_DOCENTE;
        const proximaRegra = tabela.find((r) => r.nivelOrigem === evolucao.nivelPosterior);
        updates.proximaData = proximaRegra ? adicionarAnos(evolucao.dataVigencia, proximaRegra.intersticioAnos) : null;
      }
    }

    // Desmarca outras evoluções do mesmo servidor
    await db
      .update(evolucaoFuncional)
      .set({ ehUltima: false, proximaData: null })
      .where(eq(evolucaoFuncional.servidorId, evolucao.servidorId));
  } else if (body.ehUltima === false) {
    updates.proximaData = null;
  }

  const [atualizada] = await db
    .update(evolucaoFuncional)
    .set(updates)
    .where(eq(evolucaoFuncional.id, Number(id)))
    .returning();

  return NextResponse.json(atualizada);
}

// ============================================================
// DELETE
// ============================================================
export async function DELETE(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao || sessao.papel !== "gestor") {
    return NextResponse.json({ error: "Apenas gestores" }, { status: 403 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

  await db.delete(evolucaoFuncional).where(eq(evolucaoFuncional.id, Number(id)));
  return NextResponse.json({ ok: true });
}
