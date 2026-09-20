import { NextRequest, NextResponse } from "next/server";
import { eq, asc, desc, and, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  licencaPremioCertidoes,
  licencaPremioFruicoes,
  servidores,
} from "@/db/schema";
import { obterSessao } from "@/lib/auth";

const SALDO_INICIAL = 90;
const DIAS_VALIDOS = [15, 30, 45, 60, 75, 90];

// Verifica se servidor pode ter Licença Prêmio
function podeTerLicencaPremio(categoria: string | null): boolean {
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

// Calcula saldo atual de uma certidão
async function calcularSaldo(certidaoId: number): Promise<number> {
  const fruicoes = await db
    .select({ dias: licencaPremioFruicoes.dias })
    .from(licencaPremioFruicoes)
    .where(eq(licencaPremioFruicoes.certidaoId, certidaoId));

  const totalConsumido = fruicoes.reduce((acc, f) => acc + (f.dias || 0), 0);
  return SALDO_INICIAL - totalConsumido;
}

// ============================================================
// GET
// ?tipo=certidoes&servidorId=X -> lista certidões com saldo
// ?tipo=fruicoes&certidaoId=X -> lista fruições
// ?tipo=resumo -> resumo geral (gestor)
// ============================================================
export async function GET(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const url = new URL(req.url);
  const tipo = url.searchParams.get("tipo");
  const servidorId = url.searchParams.get("servidorId");
  const certidaoId = url.searchParams.get("certidaoId");

  // Lista certidões do servidor com saldo
  if (tipo === "certidoes" && servidorId) {
    const sid = Number(servidorId);
    if (sessao.papel === "servidor" && sessao.servidorId !== sid) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const [servidor] = await db.select().from(servidores).where(eq(servidores.id, sid)).limit(1);
    if (!servidor) return NextResponse.json({ error: "Servidor não encontrado" }, { status: 404 });

    const certidoes = await db
      .select()
      .from(licencaPremioCertidoes)
      .where(eq(licencaPremioCertidoes.servidorId, sid))
      .orderBy(asc(licencaPremioCertidoes.ano), asc(licencaPremioCertidoes.numero));

    // Para cada certidão, calcula saldo e fruições
    const comSaldos = await Promise.all(
      certidoes.map(async (c) => {
        const saldo = await calcularSaldo(c.id);
        const fruicoes = await db
          .select()
          .from(licencaPremioFruicoes)
          .where(eq(licencaPremioFruicoes.certidaoId, c.id))
          .orderBy(desc(licencaPremioFruicoes.criadoEm));

        return {
          ...c,
          saldoAtual: saldo,
          saldoConsumido: c.saldoInicial - saldo,
          fruicoes,
        };
      })
    );

    return NextResponse.json({
      servidor: {
        id: servidor.id,
        nome: servidor.nomeCompleto,
        matricula: servidor.matricula,
        cargo: servidor.cargo,
        categoria: servidor.categoria,
        podeTerLicencaPremio: podeTerLicencaPremio(servidor.categoria),
      },
      certidoes: comSaldos,
    });
  }

  // Lista fruições de uma certidão específica
  if (tipo === "fruicoes" && certidaoId) {
    const fruicoes = await db
      .select()
      .from(licencaPremioFruicoes)
      .where(eq(licencaPremioFruicoes.certidaoId, Number(certidaoId)))
      .orderBy(desc(licencaPremioFruicoes.criadoEm));

    const saldo = await calcularSaldo(Number(certidaoId));

    return NextResponse.json({ fruicoes, saldoAtual: saldo });
  }

  // Resumo geral
  if (tipo === "resumo") {
    if (sessao.papel !== "gestor") {
      return NextResponse.json({ error: "Apenas gestores" }, { status: 403 });
    }

    const srvs = await db.select().from(servidores).orderBy(asc(servidores.nomeCompleto));
    const resultado = [];

    for (const s of srvs) {
      const certidoes = await db
        .select()
        .from(licencaPremioCertidoes)
        .where(eq(licencaPremioCertidoes.servidorId, s.id));

      let saldoTotal = 0;
      let totalCertidoes = 0;
      let certidoesZeradas = 0;

      for (const c of certidoes) {
        const saldo = await calcularSaldo(c.id);
        saldoTotal += saldo;
        totalCertidoes++;
        if (saldo === 0) certidoesZeradas++;
      }

      resultado.push({
        servidor: {
          id: s.id,
          nome: s.nomeCompleto,
          cargo: s.cargo,
          categoria: s.categoria,
          podeTerLicencaPremio: podeTerLicencaPremio(s.categoria),
        },
        totalCertidoes,
        certidoesZeradas,
        saldoTotal,
      });
    }

    return NextResponse.json(resultado);
  }

  return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
}

// ============================================================
// POST - Criar certidão ou fruição
// ============================================================
export async function POST(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao || sessao.papel !== "gestor") {
    return NextResponse.json({ error: "Apenas gestores" }, { status: 403 });
  }

  const url = new URL(req.url);
  const tipo = url.searchParams.get("tipo");
  const body = await req.json();

  // === Criar Certidão ===
  if (tipo === "certidao") {
    const { servidorId, numero, ano, periodoInicial, periodoFinal, dataDoe, observacao } = body;

    if (!servidorId || !numero || !ano || !periodoInicial || !periodoFinal) {
      return NextResponse.json(
        { error: "Campos obrigatórios: servidorId, numero, ano, periodoInicial, periodoFinal" },
        { status: 400 }
      );
    }

    const [servidor] = await db.select().from(servidores).where(eq(servidores.id, Number(servidorId))).limit(1);
    if (!servidor) return NextResponse.json({ error: "Servidor não encontrado" }, { status: 404 });

    if (!podeTerLicencaPremio(servidor.categoria)) {
      return NextResponse.json(
        { error: `Servidor com categoria "${servidor.categoria}" não tem direito à Licença Prêmio.` },
        { status: 400 }
      );
    }

    // Verifica duplicata (mesmo número + ano)
    const [duplicada] = await db
      .select()
      .from(licencaPremioCertidoes)
      .where(
        and(
          eq(licencaPremioCertidoes.servidorId, Number(servidorId)),
          eq(licencaPremioCertidoes.numero, Number(numero)),
          eq(licencaPremioCertidoes.ano, Number(ano))
        )
      )
      .limit(1);

    if (duplicada) {
      return NextResponse.json(
        { error: `Já existe a certidão nº ${numero}/${ano} para este servidor.` },
        { status: 400 }
      );
    }

    const [criada] = await db
      .insert(licencaPremioCertidoes)
      .values({
        servidorId: Number(servidorId),
        numero: Number(numero),
        ano: Number(ano),
        periodoInicial,
        periodoFinal,
        dataDoe: dataDoe || null,
        saldoInicial: SALDO_INICIAL,
        observacao: observacao || null,
      })
      .returning();

    return NextResponse.json({ ...criada, saldoAtual: SALDO_INICIAL }, { status: 201 });
  }

  // === Criar Fruição (Gozo ou Pecúnia) ===
  if (tipo === "fruicao") {
    const {
      certidaoId,
      tipoFruicao,
      dias,
      dataInicio,
      dataFim,
      dataDoeAutorizacao,
      anoPecunia,
      observacao,
    } = body;

    if (!certidaoId || !tipoFruicao || !dias) {
      return NextResponse.json(
        { error: "Campos obrigatórios: certidaoId, tipoFruicao, dias" },
        { status: 400 }
      );
    }

    // Valida dias
    if (!DIAS_VALIDOS.includes(Number(dias))) {
      return NextResponse.json(
        { error: `Dias deve ser um dos valores: ${DIAS_VALIDOS.join(", ")}` },
        { status: 400 }
      );
    }

    // Valida certidão existe
    const [certidao] = await db
      .select()
      .from(licencaPremioCertidoes)
      .where(eq(licencaPremioCertidoes.id, Number(certidaoId)))
      .limit(1);

    if (!certidao) return NextResponse.json({ error: "Certidão não encontrada" }, { status: 404 });

    // Verifica saldo
    const saldoAtual = await calcularSaldo(Number(certidaoId));
    if (saldoAtual <= 0) {
      return NextResponse.json(
        { error: `Certidão zerada. Saldo disponível: ${saldoAtual} dias. Não é possível registrar nova fruição.` },
        { status: 400 }
      );
    }

    if (Number(dias) > saldoAtual) {
      return NextResponse.json(
        { error: `Saldo insuficiente. Disponível: ${saldoAtual} dias, solicitado: ${dias} dias.` },
        { status: 400 }
      );
    }

    // Validações por tipo
    if (tipoFruicao === "gozo") {
      if (!dataInicio || !dataFim) {
        return NextResponse.json(
          { error: "Para GOZO são obrigatórios: dataInicio, dataFim" },
          { status: 400 }
        );
      }
    } else if (tipoFruicao === "pecunia") {
      if (!anoPecunia) {
        return NextResponse.json(
          { error: "Para PECÚNIA é obrigatório informar o anoPecunia" },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json({ error: "Tipo de fruição inválido (gozo ou pecunia)" }, { status: 400 });
    }

    const [criada] = await db
      .insert(licencaPremioFruicoes)
      .values({
        certidaoId: Number(certidaoId),
        tipo: tipoFruicao,
        dias: Number(dias),
        dataInicio: tipoFruicao === "gozo" ? dataInicio : null,
        dataFim: tipoFruicao === "gozo" ? dataFim : null,
        dataDoeAutorizacao: tipoFruicao === "gozo" ? dataDoeAutorizacao || null : null,
        anoPecunia: tipoFruicao === "pecunia" ? Number(anoPecunia) : null,
        observacao: observacao || null,
      })
      .returning();

    const novoSaldo = await calcularSaldo(Number(certidaoId));

    return NextResponse.json(
      { ...criada, saldoAtual: novoSaldo },
      { status: 201 }
    );
  }

  return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
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
  const tipo = url.searchParams.get("tipo");
  if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

  if (tipo === "certidao") {
    // Excluir fruições primeiro (cascade já faz)
    await db.delete(licencaPremioCertidoes).where(eq(licencaPremioCertidoes.id, Number(id)));
  } else if (tipo === "fruicao") {
    await db.delete(licencaPremioFruicoes).where(eq(licencaPremioFruicoes.id, Number(id)));
  } else {
    return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
