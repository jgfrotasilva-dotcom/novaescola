import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { servidores, users } from "@/db/schema";

export async function GET() {
  const diagnostico: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    ambiente: {
      node: process.version,
      plataforma: process.platform,
      ambiente: process.env.NODE_ENV || "desconhecido",
    },
    servidor: {
      status: "online",
      uptime: process.uptime(),
      memoria: {
        rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`,
        heap: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
      },
    },
    banco: {
      conectado: false,
      servidores: 0,
      usuarios: 0,
    },
  };

  try {
    await db.execute(sql`SELECT 1`);
    diagnostico.banco = {
      conectado: true,
      servidores: await db.$count(servidores),
      usuarios: await db.$count(users),
    };
  } catch (err) {
    diagnostico.banco = {
      conectado: false,
      erro: (err as Error).message,
    };
  }

  return NextResponse.json(diagnostico);
}
