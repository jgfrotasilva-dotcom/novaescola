import { NextRequest, NextResponse } from "next/server";
import { eq, asc, desc, and } from "drizzle-orm";
import { db } from "@/db";
import { evolucaoFuncional, regrasEvolucao, servidores } from "@/db/schema";
import { obterSessao } from "@/lib/auth";

// ============================================================
// REGRAS DE EVOLUÇÃO
// ============================================================
type Regra = {
  nivelOrigem: string;
  nivelDestino: string;
  intersticioAnos: number;
  pontuacaoMinima: number;
  pontuacaoAtualizacao: number;
  pontuacaoAperfeicoamento: number;
  pontuacaoProducao: number;
};

const REGRAS_DOCENTE: Regra[] = [
  { nivelOrigem: "I", nivelDestino: "II", intersticioAnos: 4, pontuacaoMinima: 35, pontuacaoAtualizacao: 4, pontuacaoAperfeicoamento: 4, pontuacaoProducao: 2 },
  { nivelOrigem: "II", nivelDestino: "III", intersticioAnos: 4, pontuacaoMinima: 40, pontuacaoAtualizacao: 4, pontuacaoAperfeicoamento: 4, pontuacaoProducao: 2 },
  { nivelOrigem: "III", nivelDestino: "IV", intersticioAnos: 5, pontuacaoMinima: 50, pontuacaoAtualizacao: 3, pontuacaoAperfeicoamento: 3, pontuacaoProducao: 4 },
  { nivelOrigem: "IV", nivelDestino: "V", intersticioAnos: 5, pontuacaoMinima: 60, pontuacaoAtualizacao: 3, pontuacaoAperfeicoamento: 3, pontuacaoProducao: 4 },
  { nivelOrigem: "V", nivelDestino: "VI", intersticioAnos: 4, pontuacaoMinima: 60, pontuacaoAtualizacao: 3, pontuacaoAperfeicoamento: 3, pontuacaoProducao: 4 },
  { nivelOrigem: "VI", nivelDestino: "VII", intersticioAnos: 4, pontuacaoMinima: 60, pontuacaoAtualizacao: 3, pontuacaoAperfeicoamento: 3, pontuacaoProducao: 4 },
  { nivelOrigem: "VII", nivelDestino: "VIII", intersticioAnos: 4, pontuacaoMinima: 60, pontuacaoAtualizacao: 3, pontuacaoAperfeicoamento: 3, pontuacaoProducao: 4 },
];

const REGRAS_DIRETOR: Regra[] = [
  { nivelOrigem: "I", nivelDestino: "II", intersticioAnos: 4, pontuacaoMinima: 35, pontuacaoAtualizacao: 4, pontuacaoAperfeicoamento: 4, pontuacaoProducao: 2 },
  { nivelOrigem: "II", nivelDestino: "III", intersticioAnos: 5, pontuacaoMinima: 40, pontuacaoAtualizacao: 4, pontuacaoAperfeicoamento: 4, pontuacaoProducao: 2 },
  { nivelOrigem: "III", nivelDestino: "IV", intersticioAnos: 6, pontuacaoMinima: 50, pontuacaoAtualizacao: 3, pontuacaoAperfeicoamento: 3, pontuacaoProducao: 4 },
  { nivelOrigem: "IV", nivelDestino: "V", intersticioAnos: 6, pontuacaoMinima: 60, pontuacaoAtualizacao: 3, pontuacaoAperfeicoamento: 3, pontuacaoProducao: 4 },
  { nivelOrigem: "V", nivelDestino: "VI", intersticioAnos: 5, pontuacaoMinima: 60, pontuacaoAtualizacao: 3, pontuacaoAperfeicoamento: 3, pontuacaoProducao: 4 },
  { nivelOrigem: "VI", nivelDestino: "VII", intersticioAnos: 5, pontuacaoMinima: 60, pontuacaoAtualizacao: 3, pontuacaoAperfeicoamento: 3, pontuacaoProducao: 4 },
  { nivelOrigem: "VII", nivelDestino: "VIII", intersticioAnos: 4, pontuacaoMinima: 60, pontuacaoAtualizacao: 3, pontuacaoAperfeicoamento: 3, pontuacaoProducao: 4 },
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
    .replace(/[\u0300-\u036f]/g, ""); // remove acentos

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

    const ultima = evs.length > 0 ? evs[evs.length - 1] : null;

    // Sugere próxima transição
    let proximaRegra: Regra | null = null;
    let proximaDataSugerida: string | null = null;
    if (analiseCargo.tipoRegra && ultima) {
      proximaRegra = getRegra(analiseCargo.tipoRegra, ultima.nivelPosterior, "");
      // Busca próxima transição possível
      const tabela = analiseCargo.tipoRegra === "DIRETOR" ? REGRAS_DIRETOR : REGRAS_DOCENTE;
      const proxima = tabela.find((r) => r.nivelOrigem === ultima.nivelPosterior);
      if (proxima) {
        proximaRegra = proxima;
        const base = ultima.dataVigencia;
        proximaDataSugerida = adicionarAnos(base, proxima.intersticioAnos);
      }
    } else if (analiseCargo.tipoRegra && evs.length === 0) {
      // Primeira evolução
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
    pontuacaoAtualizacao,
    pontuacaoAperfeicoamento,
    pontuacaoProducao,
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

  // Calcula pontuação total
  const pAtual = Number(pontuacaoAtualizacao) || 0;
  const pAperf = Number(pontuacaoAperfeicoamento) || 0;
  const pProd = Number(pontuacaoProducao) || 0;
  const pTotal = pAtual + pAperf + pProd;

  // Valida pontuação mínima
  if (pTotal < regra.pontuacaoMinima) {
    return NextResponse.json(
      {
        error: `Pontuação insuficiente. Total: ${pTotal}, mínimo: ${regra.pontuacaoMinima}.`,
        detalhePontuacao: {
          atualizacao: { obtido: pAtual, minimo: regra.pontuacaoAtualizacao },
          aperfeicoamento: { obtido: pAperf, minimo: regra.pontuacaoAperfeicoamento },
          producao: { obtido: pProd, minimo: regra.pontuacaoProducao },
        },
      },
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

  // Calcula próxima data (vigência + interstício da próxima transição)
  const tabela = analiseCargo.tipoRegra === "DIRETOR" ? REGRAS_DIRETOR : REGRAS_DOCENTE;
  const proximaRegra = tabela.find((r) => r.nivelOrigem === nivelPosterior);
  const proximaData = proximaRegra ? adicionarAnos(dataVigencia, proximaRegra.intersticioAnos) : null;

  // Data calculada (baseada na evolução anterior)
  const dataCalculada = ultima ? adicionarAnos(ultima.dataVigencia, regra.intersticioAnos) : null;

  const [criada] = await db
    .insert(evolucaoFuncional)
    .values({
      servidorId: Number(servidorId),
      numero,
      nivelAnterior,
      nivelPosterior,
      dataVigencia,
      dataDoe: dataDoe || null,
      pontuacaoTotal: pTotal,
      pontuacaoAtualizacao: pAtual,
      pontuacaoAperfeicoamento: pAperf,
      pontuacaoProducao: pProd,
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
