import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  date,
  timestamp,
  boolean,
  numeric,
  index,
} from "drizzle-orm/pg-core";

// ============================================================
// USUÁRIOS DO SISTEMA (autenticação simples)
// ============================================================
export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    matricula: varchar("matricula", { length: 32 }).notNull().unique(),
    senhaHash: varchar("senha_hash", { length: 255 }).notNull(),
    nome: varchar("nome", { length: 200 }).notNull(),
    papel: varchar("papel", { length: 20 }).notNull(), // 'servidor' | 'gestor'
    servidorId: integer("servidor_id").references(() => servidores.id, { onDelete: "cascade" }),
    ativo: boolean("ativo").notNull().default(true),
    criadoEm: timestamp("criado_em").notNull().defaultNow(),
  },
  (t) => ({
    matriculaIdx: index("users_matricula_idx").on(t.matricula),
  })
);

// ============================================================
// SERVIDORES - cadastro completo e vida funcional
// ============================================================
export const servidores = pgTable("servidores", {
  id: serial("id").primaryKey(),
  // Dados pessoais
  nomeCompleto: varchar("nome_completo", { length: 200 }).notNull(),
  cpf: varchar("cpf", { length: 14 }).notNull().unique(),
  rg: varchar("rg", { length: 30 }),
  dataNascimento: date("data_nascimento"),
  sexo: varchar("sexo", { length: 20 }),
  email: varchar("email", { length: 200 }),
  telefone: varchar("telefone", { length: 30 }),
  endereco: text("endereco"),

  // Dados funcionais
  matricula: varchar("matricula", { length: 32 }).notNull().unique(),
  cargo: varchar("cargo", { length: 120 }).notNull(),
  categoria: varchar("categoria", { length: 120 }),
  faixa: varchar("faixa", { length: 60 }),
  nivel: varchar("nivel", { length: 60 }),
  funcao: varchar("funcao", { length: 120 }),
  lotacao: varchar("lotacao", { length: 120 }).notNull().default("EE Profa. Marlene Frattini"),
  unidadeExercicio: varchar("unidade_exercicio", { length: 200 }),
  regimeJuridico: varchar("regime_juridico", { length: 80 }), // estatutário, CLT, etc.
  cargaHoraria: integer("carga_horaria"), // horas semanais
  jornada: varchar("jornada", { length: 60 }), // diurna, noturna, mista
  escolaridade: varchar("escolaridade", { length: 80 }),
  dataAdmissao: date("data_admissao").notNull(),
  dataPosse: date("data_posse"),
  dataExercicio: date("data_exercicio"),
  dtingCtd: date("dt_ing_ctd"), // Data de ingresso em CTD (contrato por tempo determinado)
  dtfimCtd: date("dt_fim_ctd"), // Data fim do CTD
  situacao: varchar("situacao", { length: 40 }).notNull().default("Ativo"), // Ativo, Afastado, Aposentado, Exonerado, Inativo
  observacoes: text("observacoes"),

  criadoEm: timestamp("criado_em").notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em").notNull().defaultNow(),
});

// ============================================================
// TIPOS DE VANTAGEM - catálogo (quinquênio, sexta-parte, etc.)
// ============================================================
export const tiposVantagem = pgTable("tipos_vantagem", {
  id: serial("id").primaryKey(),
  codigo: varchar("codigo", { length: 20 }).notNull().unique(),
  nome: varchar("nome", { length: 120 }).notNull(),
  descricao: text("descricao"),
  baseCalculo: varchar("base_calculo", { length: 40 }), // 'percentual' | 'valor_fixo'
  ativo: boolean("ativo").notNull().default(true),
});

// ============================================================
// CONFIGURAÇÃO DE VANTAGENS PESSOAIS (ATS, Quinquênio, etc.)
// ============================================================
export const configVantagensPessoais = pgTable("config_vantagens_pessoais", {
  id: serial("id").primaryKey(),
  codigo: varchar("codigo", { length: 20 }).notNull().unique(), // 'ATS', 'QUINQUENIO', 'SEXTA_PARTE'
  nome: varchar("nome", { length: 120 }).notNull(),
  descricao: text("descricao"),
  percentualPorPeriodo: numeric("percentual_por_periodo", { precision: 5, scale: 2 }).notNull(), // ex: 1.00 para 1%
  periodicidadeAnos: integer("periodicidade_anos").notNull(), // ex: 1 para anual, 5 para quinquênio
  maximoPeriodos: integer("maximo_periodos"), // null = ilimitado
  ativo: boolean("ativo").notNull().default(true),
  criadoEm: timestamp("criado_em").notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em").notNull().defaultNow(),
});

// ============================================================
// ATS - ADICIONAL POR TEMPO DE SERVIÇO (cada 5 anos - numerados)
// Apenas para servidores "A-Efetivo" ou "ACT - F"
// ============================================================
export const servidorAts = pgTable("servidor_ats", {
  id: serial("id").primaryKey(),
  servidorId: integer("servidor_id")
    .notNull()
    .references(() => servidores.id, { onDelete: "cascade" }),
  numero: integer("numero").notNull(), // 1º, 2º, 3º ATS...
  dataVigencia: date("data_vigencia").notNull(),
  dataDoe: date("data_doe"), // data de publicação no Diário Oficial
  percentual: numeric("percentual", { precision: 5, scale: 2 }).notNull().default("5.00"), // 5% por ATS
  ehUltimo: boolean("eh_ultimo").notNull().default(false),
  proximaVigencia: date("proxima_vigencia"), // calculado: dataVigencia + 1825 dias
  observacao: text("observacao"),
  criadoEm: timestamp("criado_em").notNull().defaultNow(),
});

// ============================================================
// LICENÇA PRÊMIO - CERTIDÕES
// Apenas para servidores "A-Efetivo" ou "ACT - F"
// Cada certidão tem saldo inicial de 90 dias
// ============================================================
export const licencaPremioCertidoes = pgTable("licenca_premio_certidoes", {
  id: serial("id").primaryKey(),
  servidorId: integer("servidor_id")
    .notNull()
    .references(() => servidores.id, { onDelete: "cascade" }),
  numero: integer("numero").notNull(), // nº da certidão
  ano: integer("ano").notNull(),
  periodoInicial: date("periodo_inicial").notNull(), // início do período aquisitivo
  periodoFinal: date("periodo_final").notNull(), // fim do período aquisitivo
  dataDoe: date("data_doe"), // publicação no DOE
  saldoInicial: integer("saldo_inicial").notNull().default(90), // sempre 90 dias
  observacao: text("observacao"),
  criadoEm: timestamp("criado_em").notNull().defaultNow(),
});

// ============================================================
// LICENÇA PRÊMIO - FRUIÇÕES (Gozo ou Pecúnia)
// ============================================================
export const licencaPremioFruicoes = pgTable("licenca_premio_fruicoes", {
  id: serial("id").primaryKey(),
  certidaoId: integer("certidao_id")
    .notNull()
    .references(() => licencaPremioCertidoes.id, { onDelete: "cascade" }),
  tipo: varchar("tipo", { length: 20 }).notNull(), // 'gozo' | 'pecunia'
  dias: integer("dias").notNull(), // dias consumidos (15, 30, 45, 60, 75, 90)
  // Para GOZO:
  dataInicio: date("data_inicio"),
  dataFim: date("data_fim"),
  dataDoeAutorizacao: date("data_doe_autorizacao"),
  // Para PECÚNIA:
  anoPecunia: integer("ano_pecunia"),
  observacao: text("observacao"),
  criadoEm: timestamp("criado_em").notNull().defaultNow(),
});

// ============================================================
// REGRAS DE EVOLUÇÃO FUNCIONAL (via não acadêmica)
// Tabela de referência das transições por cargo
// ============================================================
export const regrasEvolucao = pgTable("regras_evolucao", {
  id: serial("id").primaryKey(),
  tipoCargo: varchar("tipo_cargo", { length: 20 }).notNull(), // 'DOCENTE' | 'DIRETOR'
  nivelOrigem: varchar("nivel_origem", { length: 5 }).notNull(), // I, II, III...
  nivelDestino: varchar("nivel_destino", { length: 5 }).notNull(),
  intersticioAnos: integer("intersticio_anos").notNull(), // 4, 5 ou 6
  pontuacaoMinima: integer("pontuacao_minima").notNull(),
  pontuacaoAtualizacao: integer("pontuacao_atualizacao").notNull(),
  pontuacaoAperfeicoamento: integer("pontuacao_aprimoramento").notNull(),
  pontuacaoProducao: integer("pontuacao_producao").notNull(),
});

// ============================================================
// EVOLUÇÃO FUNCIONAL - REGISTROS (via não acadêmica)
// Apenas PEB I, PEB II, Diretor de Escola (A-Efetivo / ACT-F)
// ============================================================
export const evolucaoFuncional = pgTable("evolucao_funcional", {
  id: serial("id").primaryKey(),
  servidorId: integer("servidor_id")
    .notNull()
    .references(() => servidores.id, { onDelete: "cascade" }),
  numero: integer("numero").notNull(), // 1ª, 2ª, 3ª evolução
  nivelAnterior: varchar("nivel_anterior", { length: 5 }).notNull(),
  nivelPosterior: varchar("nivel_posterior", { length: 5 }).notNull(),
  dataVigencia: date("data_vigencia").notNull(),
  dataDoe: date("data_doe"),
  pontuacaoTotal: integer("pontuacao_total"),
  pontuacaoAtualizacao: integer("pontuacao_atualizacao"),
  pontuacaoAperfeicoamento: integer("pontuacao_aprimoramento"),
  pontuacaoProducao: integer("pontuacao_producao"),
  intersticioAnos: integer("intersticio_anos"),
  ultimaEvolucao: date("ultima_evolucao"), // data da evolução anterior
  proximaData: date("proxima_data"), // quando poderá evoluir novamente
  dataCalculada: date("data_calculada"), // data calculada conforme regra
  dataEfetiva: date("data_efetiva"), // data que efetivamente ocorreu
  intervencao: text("intervencao"),
  justificativa: text("justificativa"),
  responsavel: varchar("responsavel", { length: 200 }),
  criadoEm: timestamp("criado_em").notNull().defaultNow(),
});

// ============================================================
// VANTAGENS ATRIBUÍDAS AO SERVIDOR
// ============================================================
export const servidorVantagens = pgTable("servidor_vantagens", {
  id: serial("id").primaryKey(),
  servidorId: integer("servidor_id")
    .notNull()
    .references(() => servidores.id, { onDelete: "cascade" }),
  tipoVantagemId: integer("tipo_vantagem_id")
    .notNull()
    .references(() => tiposVantagem.id, { onDelete: "restrict" }),
  percentual: numeric("percentual", { precision: 8, scale: 2 }),
  valorFixo: numeric("valor_fixo", { precision: 12, scale: 2 }),
  dataInicio: date("data_inicio").notNull(),
  dataFim: date("data_fim"),
  fundamentoLegal: varchar("fundamento_legal", { length: 200 }),
  observacao: text("observacao"),
  criadoEm: timestamp("criado_em").notNull().defaultNow(),
});

// ============================================================
// HISTÓRICO FUNCIONAL (promoções, mudanças de cargo, etc.)
// ============================================================
export const historicoFuncional = pgTable("historico_funcional", {
  id: serial("id").primaryKey(),
  servidorId: integer("servidor_id")
    .notNull()
    .references(() => servidores.id, { onDelete: "cascade" }),
  dataOcorrencia: date("data_ocorrencia").notNull(),
  tipoEvento: varchar("tipo_evento", { length: 60 }).notNull(), // Promoção, Designação, Remoção, etc.
  descricao: text("descricao").notNull(),
  atoLegal: varchar("ato_legal", { length: 200 }),
  criadoEm: timestamp("criado_em").notNull().defaultNow(),
});

// ============================================================
// AFASTAMENTOS (licenças, férias, ausências)
// ============================================================
export const afastamentos = pgTable("afastamentos", {
  id: serial("id").primaryKey(),
  servidorId: integer("servidor_id")
    .notNull()
    .references(() => servidores.id, { onDelete: "cascade" }),
  tipo: varchar("tipo", { length: 80 }).notNull(), // Férias, Licença Médica, Licença Maternidade, etc.
  dataInicio: date("data_inicio").notNull(),
  dataFim: date("data_fim"),
  dias: integer("dias"),
  motivo: text("motivo"),
  criadoEm: timestamp("criado_em").notNull().defaultNow(),
});

export type Servidor = typeof servidores.$inferSelect;
export type NovoServidor = typeof servidores.$inferInsert;
export type TipoVantagem = typeof tiposVantagem.$inferSelect;
export type ServidorVantagem = typeof servidorVantagens.$inferSelect;
export type HistoricoFuncional = typeof historicoFuncional.$inferSelect;
export type Afastamento = typeof afastamentos.$inferSelect;
export type User = typeof users.$inferSelect;
