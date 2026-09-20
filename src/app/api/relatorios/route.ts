import { NextRequest, NextResponse } from "next/server";
import { eq, asc, sql } from "drizzle-orm";
import { db } from "@/db";
import { servidores } from "@/db/schema";
import { obterSessao } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao || sessao.papel !== "gestor") {
    return NextResponse.json({ error: "Apenas gestores" }, { status: 403 });
  }

  const url = new URL(req.url);
  const tipo = url.searchParams.get("tipo") || "geral";

  try {
    if (tipo === "geral") {
      // Relatório geral: todos os servidores
      const todos = await db
        .select()
        .from(servidores)
        .orderBy(asc(servidores.nomeCompleto));

      return NextResponse.json({
        tipo: "geral",
        titulo: "Relatório Geral de Servidores",
        total: todos.length,
        data: new Date().toISOString(),
        servidores: todos,
      });
    }

    if (tipo === "cargo") {
      // Relatório por cargo: agrupado
      const todos = await db
        .select()
        .from(servidores)
        .orderBy(asc(servidores.cargo), asc(servidores.nomeCompleto));

      const agrupado: Record<string, any[]> = {};
      todos.forEach((s) => {
        const cargo = s.cargo || "Não informado";
        if (!agrupado[cargo]) agrupado[cargo] = [];
        agrupado[cargo].push(s);
      });

      const resumo = Object.entries(agrupado)
        .map(([cargo, lista]) => ({
          cargo,
          total: lista.length,
          servidores: lista,
        }))
        .sort((a, b) => b.total - a.total);

      return NextResponse.json({
        tipo: "cargo",
        titulo: "Relatório de Servidores por Cargo",
        total: todos.length,
        totalCargos: resumo.length,
        data: new Date().toISOString(),
        grupos: resumo,
      });
    }

    if (tipo === "categoria") {
      // Relatório por categoria: agrupado
      const todos = await db
        .select()
        .from(servidores)
        .orderBy(asc(servidores.categoria), asc(servidores.nomeCompleto));

      const agrupado: Record<string, any[]> = {};
      todos.forEach((s) => {
        const categoria = s.categoria || "Não informada";
        if (!agrupado[categoria]) agrupado[categoria] = [];
        agrupado[categoria].push(s);
      });

      const resumo = Object.entries(agrupado)
        .map(([categoria, lista]) => ({
          categoria,
          total: lista.length,
          servidores: lista,
        }))
        .sort((a, b) => b.total - a.total);

      return NextResponse.json({
        tipo: "categoria",
        titulo: "Relatório de Servidores por Categoria",
        total: todos.length,
        totalCategorias: resumo.length,
        data: new Date().toISOString(),
        grupos: resumo,
      });
    }

    return NextResponse.json({ error: "Tipo de relatório inválido" }, { status: 400 });
  } catch (error) {
    console.error("Erro ao gerar relatório:", error);
    return NextResponse.json(
      { error: "Erro ao gerar relatório" },
      { status: 500 }
    );
  }
}
