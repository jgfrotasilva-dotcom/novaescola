import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { users, servidores } from "@/db/schema";
import { hashSenha, criarSessao } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { matricula, senha, papel } = body as {
      matricula?: string;
      senha?: string;
      papel?: string;
    };

    if (!matricula || !senha) {
      return NextResponse.json(
        { error: "Credenciais obrigatórias." },
        { status: 400 }
      );
    }

    // LOGIN DE GESTOR: matrícula + senha personalizada
    if (papel === "gestor") {
      const hash = await hashSenha(senha);
      const [user] = await db
        .select()
        .from(users)
        .where(and(eq(users.matricula, matricula), eq(users.senhaHash, hash), eq(users.ativo, true), eq(users.papel, "gestor")))
        .limit(1);

      if (!user) {
        return NextResponse.json({ error: "Matrícula ou senha inválidas." }, { status: 401 });
      }

      await criarSessao({
        userId: user.id,
        matricula: user.matricula,
        nome: user.nome,
        papel: "gestor",
        servidorId: user.servidorId,
      });

      return NextResponse.json({ ok: true, papel: "gestor", nome: user.nome });
    }

    // LOGIN DE SERVIDOR: CPF + data de nascimento (DDMMAAAA)
    const cpfLimpo = matricula.replace(/\D/g, "");
    if (cpfLimpo.length !== 11) {
      return NextResponse.json({ error: "CPF inválido." }, { status: 400 });
    }

    // Busca servidor pelo CPF
    const [servidor] = await db
      .select()
      .from(servidores)
      .where(eq(servidores.cpf, matricula.includes(".") ? matricula : `${cpfLimpo.slice(0,3)}.${cpfLimpo.slice(3,6)}.${cpfLimpo.slice(6,9)}-${cpfLimpo.slice(9)}`))
      .limit(1);

    if (!servidor) {
      return NextResponse.json({ error: "CPF não encontrado." }, { status: 404 });
    }

    // Valida data de nascimento (senha = DDMMAAAA)
    if (!servidor.dataNascimento) {
      return NextResponse.json({ error: "Data de nascimento não cadastrada." }, { status: 403 });
    }

    // Converte dataNascimento (YYYY-MM-DD) para DDMMAAAA
    const [ano, mes, dia] = servidor.dataNascimento.split("-");
    const senhaEsperada = `${dia}${mes}${ano}`;

    if (senha !== senhaEsperada) {
      return NextResponse.json({ error: "Data de nascimento incorreta." }, { status: 401 });
    }

    // Busca user associado ao servidor
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.servidorId, servidor.id), eq(users.ativo, true)))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    }

    await criarSessao({
      userId: user.id,
      matricula: user.matricula,
      nome: user.nome,
      papel: "servidor",
      servidorId: servidor.id,
    });

    return NextResponse.json({ ok: true, papel: "servidor", nome: user.nome });
  } catch (err) {
    console.error("Erro no login:", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

export async function GET() {
  const { obterSessao } = await import("@/lib/auth");
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ logado: false });
  return NextResponse.json({ logado: true, ...sessao });
}

export async function DELETE() {
  const { limparSessao } = await import("@/lib/auth");
  await limparSessao();
  return NextResponse.json({ ok: true });
}
