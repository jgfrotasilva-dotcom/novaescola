import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, sql } from "drizzle-orm";
import {
  users,
  servidores,
} from "./schema";

// Hash simples compatível com seed.ts e auth.ts
async function hashSenha(senha: string) {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(senha + "::frattini"));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Gera senha padrão baseada na data de nascimento (DDMMAAAA)
function gerarSenhaPadrao(dataNascimento: string | null): string {
  if (!dataNascimento) return "12345678";
  const [y, m, d] = dataNascimento.split("-");
  if (!y || !m || !d) return "12345678";
  return `${d}${m}${y}`;
}

async function main() {
  console.log("🔗 Sincronizando servidores com tabela users...");

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL não configurada");

  const pool = new Pool({
    connectionString: databaseUrl,
    max: 5,
    connectionTimeoutMillis: 15000,
    ssl: { rejectUnauthorized: false },
  });
  const db = drizzle(pool);

  try {
    // Lista todos os servidores
    const todosServidores = await db.select().from(servidores);
    console.log(`   Encontrados ${todosServidores.length} servidores`);

    // Lista todos os usuários
    const todosUsers = await db.select().from(users);
    console.log(`   Encontrados ${todosUsers.length} usuários`);

    // Remove users órfãos (que apontam para servidor_id inexistente)
    const idsServidores = new Set(todosServidores.map((s) => s.id));
    let orfaosRemovidos = 0;

    for (const user of todosUsers) {
      if (user.papel === "servidor" && user.servidorId && !idsServidores.has(user.servidorId)) {
        await db.delete(users).where(eq(users.id, user.id));
        orfaosRemovidos++;
        console.log(`   ✗ Removido user órfão: ${user.matricula} (servidor_id ${user.servidorId} não existe)`);
      }
    }

    if (orfaosRemovidos > 0) {
      console.log(`   ${orfaosRemovidos} usuários órfãos removidos`);
    }

    // Recarrega lista de users após remoção
    const usersAtuais = await db.select().from(users);
    const servidorIdsComUser = new Set(
      usersAtuais.filter((u) => u.servidorId).map((u) => u.servidorId!)
    );

    // Para cada servidor sem user, criar um
    let criados = 0;
    let pulados = 0;

    for (const servidor of todosServidores) {
      if (servidorIdsComUser.has(servidor.id)) {
        pulados++;
        continue;
      }

      // Verifica se já existe user com essa matrícula
      const [userExistente] = await db
        .select()
        .from(users)
        .where(eq(users.matricula, servidor.matricula))
        .limit(1);

      if (userExistente) {
        // Atualiza o servidor_id do user existente
        await db
          .update(users)
          .set({ servidorId: servidor.id, nome: servidor.nomeCompleto })
          .where(eq(users.id, userExistente.id));
        console.log(`   ~ Atualizado user existente: ${servidor.matricula}`);
        criados++;
        continue;
      }

      // Cria novo user
      const senhaPadrao = gerarSenhaPadrao(servidor.dataNascimento);
      const hash = await hashSenha(senhaPadrao);

      await db.insert(users).values({
        matricula: servidor.matricula,
        senhaHash: hash,
        nome: servidor.nomeCompleto,
        papel: "servidor",
        servidorId: servidor.id,
        ativo: true,
      });

      criados++;
      if (criados <= 5) {
        console.log(`   ✓ Criado user: ${servidor.matricula} | ${servidor.nomeCompleto.substring(0, 30)}`);
      }
    }

    if (criados > 5) {
      console.log(`   ... e mais ${criados - 5} usuários criados`);
    }

    console.log("");
    console.log("📊 Resumo:");
    console.log(`   Usuários órfãos removidos: ${orfaosRemovidos}`);
    console.log(`   Usuários criados/atualizados: ${criados}`);
    console.log(`   Usuários já existentes (pulados): ${pulados}`);

    // Lista final
    const finalUsers = await db.select().from(users);
    console.log("");
    console.log(`✅ Total final de usuários: ${finalUsers.length}`);

    const gestores = finalUsers.filter((u) => u.papel === "gestor").length;
    const srvs = finalUsers.filter((u) => u.papel === "servidor").length;
    console.log(`   Gestores: ${gestores}`);
    console.log(`   Servidores: ${srvs}`);
  } catch (err) {
    console.error("❌ Erro:", err);
    process.exit(1);
  }

  await pool.end();
  process.exit(0);
}

main();
