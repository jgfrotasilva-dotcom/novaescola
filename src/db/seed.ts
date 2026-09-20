import "dotenv/config";
import { db } from "./index";
import {
  users,
  servidores,
  tiposVantagem,
  servidorVantagens,
  historicoFuncional,
  afastamentos,
  configVantagensPessoais,
  servidorAts,
  licencaPremioCertidoes,
  licencaPremioFruicoes,
  evolucaoFuncional,
} from "./schema";
import { sql } from "drizzle-orm";

// Hash simples - apenas para demo (em produção usar bcrypt/argon2)
async function hashSenha(senha: string) {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(senha + "::frattini"));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function main() {
  console.log("🌱 Executando seed do banco de dados...");

  // Limpa tabelas (DELETE funciona melhor em poolers que TRUNCATE)
  console.log("   Limpando tabelas existentes...");
  await db.delete(servidorVantagens);
  await db.delete(historicoFuncional);
  await db.delete(afastamentos);
  await db.delete(servidorAts);
  await db.delete(licencaPremioFruicoes);
  await db.delete(licencaPremioCertidoes);
  await db.delete(evolucaoFuncional);
  await db.delete(users);
  await db.delete(servidores);
  await db.delete(tiposVantagem);
  await db.delete(configVantagensPessoais);

  // Catálogo de vantagens típicas do serviço público
  const [q, sp, an, gt, ae, at, gv, pd] = await db
    .insert(tiposVantagem)
    .values([
      { codigo: "QUINQ", nome: "Quinquênio", descricao: "Adicional por tempo de serviço - 5% a cada 5 anos", baseCalculo: "percentual" },
      { codigo: "SEXTA", nome: "Sexta-Parte", descricao: "Adicional após 20 anos de serviço - 1/6 do vencimento", baseCalculo: "percentual" },
      { codigo: "AN", nome: "Adicional Noturno", descricao: "Adicional por trabalho no período noturno (20h-5h)", baseCalculo: "percentual" },
      { codigo: "GT", nome: "Gratificação de Turno", descricao: "Gratificação por exercício em turno especial", baseCalculo: "percentual" },
      { codigo: "AE", nome: "Adicional de Especialização", descricao: "Adicional por titulação/pós-graduação", baseCalculo: "percentual" },
      { codigo: "AT", nome: "Adicional de Tempo de Serviço", descricao: "Adicional por tempo de serviço público", baseCalculo: "percentual" },
      { codigo: "GV", nome: "Gratificação de Valor", descricao: "Gratificação de valor fixo", baseCalculo: "valor_fixo" },
      { codigo: "PD", nome: "Progressão/Desenvolvimento", descricao: "Progressão funcional por avaliação de desempenho", baseCalculo: "percentual" },
    ])
    .returning();

  // Servidores de exemplo
  const servidorRows = await db
    .insert(servidores)
    .values([
      {
        nomeCompleto: "Maria Aparecida Silva Santos",
        cpf: "123.456.789-00",
        rg: "12.345.678-9",
        dataNascimento: "1978-05-14",
        email: "maria.santos@educacao.sp.gov.br",
        telefone: "(17) 99123-4567",
        endereco: "Rua das Flores, 123 - Centro",
        matricula: "2015001",
        cargo: "Professor de Educação Básica II",
        funcao: "Coordenadora Pedagógica",
        lotacao: "EE Profa. Marlene Frattini",
        unidadeExercicio: "EE Profa. Marlene Frattini - Sala da Coordenação",
        regimeJuridico: "Estatutário",
        cargaHoraria: 40,
        jornada: "Diurna",
        escolaridade: "Mestrado em Educação",
        dataAdmissao: "2015-02-01",
        dataPosse: "2015-02-01",
        dataExercicio: "2015-02-03",
        situacao: "Ativo",
        observacoes: "Servidora exemplar, participa ativamente dos projetos pedagógicos.",
      },
      {
        nomeCompleto: "João Pedro Almeida",
        cpf: "234.567.890-11",
        rg: "23.456.789-0",
        dataNascimento: "1985-08-22",
        email: "joao.almeida@educacao.sp.gov.br",
        telefone: "(17) 99234-5678",
        endereco: "Av. Brasil, 456 - Jardim América",
        matricula: "2018045",
        cargo: "Professor de Educação Básica II",
        funcao: null,
        lotacao: "EE Profa. Marlene Frattini",
        unidadeExercicio: "EE Profa. Marlene Frattini - 8º e 9º anos",
        regimeJuridico: "Estatutário",
        cargaHoraria: 30,
        jornada: "Diurna",
        escolaridade: "Especialização em Matemática",
        dataAdmissao: "2018-03-15",
        dataPosse: "2018-03-15",
        dataExercicio: "2018-03-16",
        situacao: "Ativo",
      },
      {
        nomeCompleto: "Ana Carolina Ferreira",
        cpf: "345.678.901-22",
        rg: "34.567.890-1",
        dataNascimento: "1990-11-03",
        email: "ana.ferreira@educacao.sp.gov.br",
        telefone: "(17) 99345-6789",
        endereco: "Rua São Paulo, 789 - Vila Nova",
        matricula: "2021012",
        cargo: "Agente de Organização Escolar",
        funcao: null,
        lotacao: "EE Profa. Marlene Frattini",
        unidadeExercicio: "EE Profa. Marlene Frattini - Secretaria",
        regimeJuridico: "Estatutário",
        cargaHoraria: 40,
        jornada: "Diurna",
        escolaridade: "Ensino Superior - Administração",
        dataAdmissao: "2021-06-10",
        dataPosse: "2021-06-10",
        dataExercicio: "2021-06-11",
        situacao: "Ativo",
      },
      {
        nomeCompleto: "Carlos Eduardo Lima",
        cpf: "456.789.012-33",
        rg: "45.678.901-2",
        dataNascimento: "1972-02-28",
        email: "carlos.lima@educacao.sp.gov.br",
        telefone: "(17) 99456-7890",
        endereco: "Rua Minas Gerais, 321 - Centro",
        matricula: "2005003",
        cargo: "Diretor de Escola",
        funcao: "Diretor",
        lotacao: "EE Profa. Marlene Frattini",
        unidadeExercicio: "EE Profa. Marlene Frattini - Diretoria",
        regimeJuridico: "Estatutário",
        cargaHoraria: 40,
        jornada: "Diurna",
        escolaridade: "Doutorado em Gestão Educacional",
        dataAdmissao: "2005-01-20",
        dataPosse: "2005-01-20",
        dataExercicio: "2005-01-21",
        situacao: "Ativo",
        observacoes: "Diretor da unidade desde 2018.",
      },
      {
        nomeCompleto: "Patrícia Mendes Oliveira",
        cpf: "567.890.123-44",
        rg: "56.789.012-3",
        dataNascimento: "1988-07-19",
        email: "patricia.oliveira@educacao.sp.gov.br",
        telefone: "(17) 99567-8901",
        endereco: "Rua Paraná, 654 - Jardim do Lago",
        matricula: "2019022",
        cargo: "Professor de Educação Básica I",
        funcao: null,
        lotacao: "EE Profa. Marlene Frattini",
        unidadeExercicio: "EE Profa. Marlene Frattini - 1º ao 5º ano",
        regimeJuridico: "Estatutário",
        cargaHoraria: 40,
        jornada: "Diurna",
        escolaridade: "Pós-graduação em Alfabetização",
        dataAdmissao: "2019-02-04",
        dataPosse: "2019-02-04",
        dataExercicio: "2019-02-05",
        situacao: "Ativo",
      },
    ])
    .returning();

  const [maria, joao, ana, carlos, patricia] = servidorRows;

  // Vantagens dos servidores
  await db.insert(servidorVantagens).values([
    { servidorId: maria.id, tipoVantagemId: q.id, percentual: "5.00", dataInicio: "2020-02-01", fundamentoLegal: "Lei Complementar nº 1.144/2011" },
    { servidorId: maria.id, tipoVantagemId: q.id, percentual: "5.00", dataInicio: "2025-02-01", fundamentoLegal: "Lei Complementar nº 1.144/2011 - 2º quinquênio" },
    { servidorId: maria.id, tipoVantagemId: ae.id, percentual: "15.00", dataInicio: "2020-08-01", fundamentoLegal: "Resolução SE 68/2016 - Mestrado" },
    { servidorId: maria.id, tipoVantagemId: gt.id, percentual: "10.00", dataInicio: "2022-01-01", fundamentoLegal: "Lei 12.872/2008" },

    { servidorId: joao.id, tipoVantagemId: q.id, percentual: "5.00", dataInicio: "2023-03-15", fundamentoLegal: "Lei Complementar nº 1.144/2011" },
    { servidorId: joao.id, tipoVantagemId: ae.id, percentual: "10.00", dataInicio: "2019-05-01", fundamentoLegal: "Resolução SE 68/2016 - Especialização" },

    { servidorId: ana.id, tipoVantagemId: q.id, percentual: "5.00", dataInicio: "2026-06-10", fundamentoLegal: "Lei Complementar nº 1.144/2011" },

    { servidorId: carlos.id, tipoVantagemId: q.id, percentual: "5.00", dataInicio: "2010-01-20", fundamentoLegal: "1º quinquênio" },
    { servidorId: carlos.id, tipoVantagemId: q.id, percentual: "5.00", dataInicio: "2015-01-20", fundamentoLegal: "2º quinquênio" },
    { servidorId: carlos.id, tipoVantagemId: q.id, percentual: "5.00", dataInicio: "2020-01-20", fundamentoLegal: "3º quinquênio" },
    { servidorId: carlos.id, tipoVantagemId: q.id, percentual: "5.00", dataInicio: "2025-01-20", fundamentoLegal: "4º quinquênio" },
    { servidorId: carlos.id, tipoVantagemId: sp.id, percentual: "16.66", dataInicio: "2025-01-20", fundamentoLegal: "Art. 123 - Estatuto - Sexta-parte" },
    { servidorId: carlos.id, tipoVantagemId: ae.id, percentual: "20.00", dataInicio: "2018-01-01", fundamentoLegal: "Resolução SE 68/2016 - Doutorado" },

    { servidorId: patricia.id, tipoVantagemId: q.id, percentual: "5.00", dataInicio: "2024-02-04", fundamentoLegal: "Lei Complementar nº 1.144/2011" },
    { servidorId: patricia.id, tipoVantagemId: ae.id, percentual: "10.00", dataInicio: "2021-01-01", fundamentoLegal: "Resolução SE 68/2016 - Pós-graduação" },
  ]);

  // Histórico funcional
  await db.insert(historicoFuncional).values([
    { servidorId: maria.id, dataOcorrencia: "2015-02-01", tipoEvento: "Admissão", descricao: "Nomeação para cargo de Professor de Educação Básica II", atoLegal: "DOE 01/02/2015 - Portaria 123/2015" },
    { servidorId: maria.id, dataOcorrencia: "2018-03-01", tipoEvento: "Designação", descricao: "Designada para exercer a função de Coordenadora Pedagógica", atoLegal: "Portaria 456/2018" },
    { servidorId: maria.id, dataOcorrencia: "2020-06-01", tipoEvento: "Promoção", descricao: "Progressão por titulação - Mestrado em Educação", atoLegal: "Portaria 789/2020" },

    { servidorId: carlos.id, dataOcorrencia: "2005-01-20", tipoEvento: "Admissão", descricao: "Nomeação para cargo de Professor", atoLegal: "DOE 19/01/2005" },
    { servidorId: carlos.id, dataOcorrencia: "2018-01-01", tipoEvento: "Designação", descricao: "Designado Diretor da EE Profa. Marlene Frattini", atoLegal: "Portaria 001/2018 - DRE" },

    { servidorId: joao.id, dataOcorrencia: "2018-03-15", tipoEvento: "Admissão", descricao: "Nomeação para cargo de Professor de Educação Básica II", atoLegal: "DOE 14/03/2018" },

    { servidorId: ana.id, dataOcorrencia: "2021-06-10", tipoEvento: "Admissão", descricao: "Nomeação para cargo de Agente de Organização Escolar", atoLegal: "DOE 09/06/2021" },

    { servidorId: patricia.id, dataOcorrencia: "2019-02-04", tipoEvento: "Admissão", descricao: "Nomeação para cargo de Professor de Educação Básica I", atoLegal: "DOE 03/02/2019" },
  ]);

  // Afastamentos
  await db.insert(afastamentos).values([
    { servidorId: joao.id, tipo: "Férias", dataInicio: "2024-01-10", dataFim: "2024-01-30", dias: 20, motivo: "Férias regulamentares - período aquisitivo 2023" },
    { servidorId: joao.id, tipo: "Licença Médica", dataInicio: "2024-08-05", dataFim: "2024-08-10", dias: 5, motivo: "Atestado médico - gripe" },
    { servidorId: maria.id, tipo: "Férias", dataInicio: "2024-07-01", dataFim: "2024-07-30", dias: 30, motivo: "Férias regulamentares" },
    { servidorId: patricia.id, tipo: "Licença Maternidade", dataInicio: "2023-03-01", dataFim: "2023-08-28", dias: 180, motivo: "Licença maternidade - 180 dias" },
    { servidorId: carlos.id, tipo: "Férias", dataInicio: "2024-12-20", dataFim: "2025-01-18", dias: 30, motivo: "Férias regulamentares" },
  ]);

  // Configurações de vantagens pessoais (ATS, Quinquênio, etc.)
  await db.insert(configVantagensPessoais).values([
    {
      codigo: "ATS",
      nome: "Adicional por Tempo de Serviço",
      descricao: "Adicional de 1% ao ano sobre o vencimento base, concedido anualmente",
      percentualPorPeriodo: "1.00",
      periodicidadeAnos: 1,
      maximoPeriodos: null,
      ativo: true,
    },
    {
      codigo: "QUINQ",
      nome: "Quinquênio",
      descricao: "Adicional de 5% a cada 5 anos de efetivo exercício",
      percentualPorPeriodo: "5.00",
      periodicidadeAnos: 5,
      maximoPeriodos: null,
      ativo: true,
    },
    {
      codigo: "SEXTA",
      nome: "Sexta-Parte",
      descricao: "Adicional de 1/6 (16,66%) sobre o vencimento após 20 anos de serviço",
      percentualPorPeriodo: "16.66",
      periodicidadeAnos: 20,
      maximoPeriodos: 1,
      ativo: true,
    },
  ]);

  // Usuários do sistema
  const senhaGestor = await hashSenha("gestor123");
  const senhaServidor = await hashSenha("servidor123");

  await db.insert(users).values([
    { matricula: "GESTOR", senhaHash: senhaGestor, nome: "Carlos Eduardo Lima", papel: "gestor", servidorId: carlos.id },
    { matricula: maria.matricula, senhaHash: senhaServidor, nome: maria.nomeCompleto, papel: "servidor", servidorId: maria.id },
    { matricula: joao.matricula, senhaHash: senhaServidor, nome: joao.nomeCompleto, papel: "servidor", servidorId: joao.id },
    { matricula: ana.matricula, senhaHash: senhaServidor, nome: ana.nomeCompleto, papel: "servidor", servidorId: ana.id },
    { matricula: patricia.matricula, senhaHash: senhaServidor, nome: patricia.nomeCompleto, papel: "servidor", servidorId: patricia.id },
  ]);

  console.log("✅ Seed concluído com sucesso!");
  console.log("   Gestor: matricula=GESTOR | senha=gestor123");
  console.log("   Servidor exemplo: matricula=2015001 | senha=servidor123");

  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Erro no seed:", err);
  process.exit(1);
});
