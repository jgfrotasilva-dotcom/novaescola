import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { servidores, users } from "@/db/schema";
import { obterSessao, hashSenha } from "@/lib/auth";
import { processarPlanilha, gerarPlanilhaModelo } from "@/lib/excel";

// Gera senha padrão baseada na data de nascimento (DDMMAAAA)
function gerarSenhaPadrao(dataNascimento: string | null): string {
  if (!dataNascimento) return "12345678";
  const [y, m, d] = dataNascimento.split("-");
  if (!y || !m || !d) return "12345678";
  return `${d}${m}${y}`;
}

// Gera uma matrícula única baseada em timestamp + random
async function gerarMatricula(): Promise<string> {
  const ano = new Date().getFullYear();
  const seq = Math.floor(Math.random() * 9999)
    .toString()
    .padStart(4, "0");
  return `${ano}${seq}`;
}

async function matriculaUnica(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const m = await gerarMatricula();
    const [existe] = await db
      .select({ id: servidores.id })
      .from(servidores)
      .where(eq(servidores.matricula, m))
      .limit(1);
    if (!existe) return m;
  }
  // Fallback com nanoid
  return `${new Date().getFullYear()}${Date.now().toString().slice(-6)}`;
}

// GET /api/import?modelo=1 -> baixa planilha modelo
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  if (url.searchParams.get("modelo") === "1") {
    const buffer = gerarPlanilhaModelo();
    const u8 = new Uint8Array(buffer);
    return new NextResponse(u8, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="modelo_servidores.xlsx"',
      },
    });
  }
  return NextResponse.json({ ok: true });
}

// POST /api/import -> faz upload e pré-cadastra
export async function POST(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao || sessao.papel !== "gestor") {
    return NextResponse.json({ error: "Apenas gestores podem importar" }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Arquivo não recebido" }, { status: 400 });
  }

  const arquivo = formData.get("arquivo") as File | null;
  const modo = (formData.get("modo") as string) || "preview"; // 'preview' | 'confirmar'

  if (!arquivo) {
    return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
  }

  const buffer = Buffer.from(await arquivo.arrayBuffer());

  try {
    const resultado = await processarPlanilha(buffer);

    if (modo === "confirmar") {
      // Confirma: insere no banco (ignorando duplicatas de CPF)
      let inseridos = 0;
      let ignorados = 0;
      const errosDB: { linha: number; motivo: string; cpf: string }[] = [];

      for (let i = 0; i < resultado.importados.length; i++) {
        const r = resultado.importados[i];
        // Verifica se CPF já existe
        const [existe] = await db
          .select({ id: servidores.id })
          .from(servidores)
          .where(eq(servidores.cpf, r.cpf))
          .limit(1);

        if (existe) {
          ignorados++;
          errosDB.push({
            linha: i + 2,
            motivo: `CPF ${r.cpf} já cadastrado`,
            cpf: r.cpf,
          });
          continue;
        }

        try {
          const matricula = await matriculaUnica();
          const [servidorCriado] = await db.insert(servidores).values({
            matricula,
            nomeCompleto: r.nomeCompleto,
            cpf: r.cpf,
            rg: r.rg,
            dataNascimento: r.dataNascimento,
            sexo: r.sexo,
            email: r.email,
            telefone: r.telefone,
            cargo: r.cargo,
            categoria: r.categoria,
            faixa: r.faixa,
            nivel: r.nivel,
            jornada: r.jornada,
            lotacao: r.lotacao,
            dataPosse: r.dataPosse,
            dataExercicio: r.dataExercicio,
            dataAdmissao: r.dataPosse || r.dataExercicio || r.dtingCtd || new Date().toISOString().slice(0, 10),
            dtingCtd: r.dtingCtd,
            dtfimCtd: r.dtfimCtd,
            situacao: r.situacao,
          }).returning();
          
          // Criar automaticamente um usuário para o servidor importado
          try {
            const senhaPadrao = gerarSenhaPadrao(servidorCriado.dataNascimento);
            const senhaHash = await hashSenha(senhaPadrao);
            
            await db.insert(users).values({
              matricula: servidorCriado.matricula,
              senhaHash,
              nome: servidorCriado.nomeCompleto,
              papel: "servidor",
              servidorId: servidorCriado.id,
              ativo: true,
            });
          } catch (userErr) {
            console.error(`Erro ao criar usuário para ${servidorCriado.matricula}:`, userErr);
            // Não falha a importação se a criação do usuário falhar
          }
          
          inseridos++;
        } catch (err) {
          errosDB.push({
            linha: i + 2,
            motivo: (err as Error).message,
            cpf: r.cpf,
          });
        }
      }

      return NextResponse.json({
        ok: true,
        inseridos,
        ignorados,
        errosValidacao: resultado.erros,
        errosBanco: errosDB,
        total: resultado.total,
      });
    }

    // Preview: só retorna os dados parseados
    return NextResponse.json({
      ok: true,
      modo: "preview",
      total: resultado.total,
      sucesso: resultado.sucesso,
      errosValidacao: resultado.erros,
      importados: resultado.importados,
    });
  } catch (err) {
    console.error("Erro ao processar planilha:", err);
    return NextResponse.json(
      { error: (err as Error).message || "Erro ao processar a planilha" },
      { status: 400 }
    );
  }
}
