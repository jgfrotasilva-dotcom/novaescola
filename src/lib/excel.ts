import * as XLSX from "xlsx";

// Normaliza cabeçalho para facilitar matching
function normalizarCabecalho(h: string): string {
  return (h || "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/\s+/g, "") // remove espaços
    .replace(/[._-]/g, ""); // remove separadores
}

// Converte datas seriais do Excel para YYYY-MM-DD
function parseExcelDate(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;

  // Já é string no formato esperado
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return null;
    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    // DD/MM/YYYY
    const m1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (m1) {
      const d = m1[1].padStart(2, "0");
      const mo = m1[2].padStart(2, "0");
      let y = m1[3];
      if (y.length === 2) y = (parseInt(y) > 50 ? "19" : "20") + y;
      return `${y}-${mo}-${d}`;
    }
    return null;
  }

  // Número serial do Excel
  if (typeof v === "number") {
    // Excel epoch: 1900-01-01, mas com bug histórico (considera 1900 como bissexto)
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(excelEpoch.getTime() + v * 86400000);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10);
  }

  // Date object
  if (v instanceof Date && !isNaN(v.getTime())) {
    return v.toISOString().slice(0, 10);
  }

  return null;
}

function normalizarSituacao(v: unknown): string {
  const s = (v || "").toString().trim().toLowerCase();
  if (s === "inativo" || s === "inativa") return "Inativo";
  if (s === "afastado" || s === "afastada") return "Afastado";
  if (s === "aposentado" || s === "aposentada") return "Aposentado";
  if (s === "exonerado" || s === "exonerada") return "Exonerado";
  return "Ativo";
}

function normalizarSexo(v: unknown): string | null {
  const s = (v || "").toString().trim().toUpperCase();
  if (!s) return null;
  if (s === "M" || s.startsWith("MASC")) return "Masculino";
  if (s === "F" || s.startsWith("FEM")) return "Feminino";
  if (s.startsWith("OUTR") || s === "O") return "Outro";
  return s;
}

// Mapeamento de cabeçalhos esperados para campos internos
const MAPEAMENTO: Record<string, string> = {
  nome: "nomeCompleto",
  nomecompleto: "nomeCompleto",
  cpf: "cpf",
  rg: "rg",
  datadenascimento: "dataNascimento",
  datanascimento: "dataNascimento",
  nascimento: "dataNascimento",
  sexo: "sexo",
  telefone: "telefone",
  fone: "telefone",
  celular: "telefone",
  email: "email",
  cargo: "cargo",
  categoria: "categoria",
  faixa: "faixa",
  nivel: "nivel",
  nível: "nivel",
  jornada: "jornada",
  lotacao: "lotacao",
  lotação: "lotacao",
  dataposse: "dataPosse",
  datadeposse: "dataPosse",
  posse: "dataPosse",
  dataexercicio: "dataExercicio",
  datadeexercicio: "dataExercicio",
  exercicio: "dataExercicio",
  dtingctd: "dtingCtd",
  dtfimctd: "dtfimCtd",
  situacao: "situacao",
  situação: "situacao",
};

function mapearCampo(h: string): string | null {
  const n = normalizarCabecalho(h);
  return MAPEAMENTO[n] || null;
}

export type LinhaImportada = {
  nomeCompleto: string;
  cpf: string;
  rg: string | null;
  dataNascimento: string | null;
  sexo: string | null;
  telefone: string | null;
  email: string | null;
  cargo: string;
  categoria: string | null;
  faixa: string | null;
  nivel: string | null;
  jornada: string | null;
  lotacao: string;
  dataPosse: string | null;
  dataExercicio: string | null;
  dtingCtd: string | null;
  dtfimCtd: string | null;
  situacao: string;
};

export type ResultadoImportacao = {
  total: number;
  sucesso: number;
  erros: { linha: number; motivo: string; dados: Partial<LinhaImportada> }[];
  importados: LinhaImportada[];
};

function formatarCPF(raw: unknown): string {
  const s = (raw || "").toString().replace(/\D/g, "");
  if (s.length !== 11) return (raw || "").toString().trim();
  return s.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

export async function processarPlanilha(buffer: Buffer): Promise<ResultadoImportacao> {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const nomeAba = workbook.SheetNames[0];
  if (!nomeAba) throw new Error("A planilha não contém nenhuma aba.");

  const sheet = workbook.Sheets[nomeAba];
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
    defval: "",
    raw: true,
  });

  if (rows.length === 0) throw new Error("A planilha está vazia.");

  // Descobre o mapeamento da primeira linha (cabeçalhos)
  const primeiraLinha = rows[0];
  const map: Record<string, string> = {};
  for (const header of Object.keys(primeiraLinha)) {
    const campo = mapearCampo(header);
    if (campo) map[header] = campo;
  }

  const camposObrigatorios = ["nomeCompleto", "cpf", "cargo"];
  const camposMapeados = Object.values(map);
  const faltando = camposObrigatorios.filter((c) => !camposMapeados.includes(c));
  if (faltando.length > 0) {
    throw new Error(
      `Cabeçalhos obrigatórios não encontrados: ${faltando.join(", ")}. ` +
        `Esperado: Nome, CPF, Cargo, Lotação (ao mínimo).`
    );
  }

  const resultado: ResultadoImportacao = {
    total: rows.length,
    sucesso: 0,
    erros: [],
    importados: [],
  };

  const cpfsVistos = new Set<string>();

  rows.forEach((row, idx) => {
    const linha = idx + 2; // +1 cabeçalho, +1 base 1
    const dados: Record<string, unknown> = {};

    for (const [header, valor] of Object.entries(row)) {
      const campo = map[header];
      if (!campo) continue;

      // Campos de data
      if (
        [
          "dataNascimento",
          "dataPosse",
          "dataExercicio",
          "dtingCtd",
          "dtfimCtd",
        ].includes(campo)
      ) {
        dados[campo] = parseExcelDate(valor);
      } else if (campo === "situacao") {
        dados[campo] = normalizarSituacao(valor);
      } else if (campo === "sexo") {
        dados[campo] = normalizarSexo(valor);
      } else if (campo === "cpf") {
        dados[campo] = formatarCPF(valor);
      } else {
        const v = valor === null || valor === undefined ? "" : valor.toString().trim();
        dados[campo] = v || null;
      }
    }

    // Validações mínimas
    const nome = (dados.nomeCompleto || "").toString().trim();
    const cpf = (dados.cpf || "").toString().trim();
    const cargo = (dados.cargo || "").toString().trim();
    const lotacao = (dados.lotacao || "").toString().trim() || "EE Profa. Marlene Frattini";

    if (!nome) {
      resultado.erros.push({ linha, motivo: "Nome vazio", dados: dados as Partial<LinhaImportada> });
      return;
    }
    if (!cpf) {
      resultado.erros.push({ linha, motivo: "CPF vazio", dados: dados as Partial<LinhaImportada> });
      return;
    }
    if (cpf.replace(/\D/g, "").length !== 11) {
      resultado.erros.push({ linha, motivo: "CPF inválido", dados: dados as Partial<LinhaImportada> });
      return;
    }
    if (!cargo) {
      resultado.erros.push({ linha, motivo: "Cargo vazio", dados: dados as Partial<LinhaImportada> });
      return;
    }
    if (cpfsVistos.has(cpf)) {
      resultado.erros.push({ linha, motivo: "CPF duplicado na planilha", dados: dados as Partial<LinhaImportada> });
      return;
    }
    cpfsVistos.add(cpf);

    const registro: LinhaImportada = {
      nomeCompleto: nome,
      cpf,
      rg: (dados.rg || "").toString().trim() || null,
      dataNascimento: (dados.dataNascimento as string) || null,
      sexo: (dados.sexo as string) || null,
      telefone: (dados.telefone || "").toString().trim() || null,
      email: (dados.email || "").toString().trim() || null,
      cargo,
      categoria: (dados.categoria || "").toString().trim() || null,
      faixa: (dados.faixa || "").toString().trim() || null,
      nivel: (dados.nivel || "").toString().trim() || null,
      jornada: (dados.jornada || "").toString().trim() || null,
      lotacao,
      dataPosse: (dados.dataPosse as string) || null,
      dataExercicio: (dados.dataExercicio as string) || null,
      dtingCtd: (dados.dtingCtd as string) || null,
      dtfimCtd: (dados.dtfimCtd as string) || null,
      situacao: (dados.situacao as string) || "Ativo",
    };

    resultado.importados.push(registro);
    resultado.sucesso++;
  });

  return resultado;
}

// Gera a planilha modelo
export function gerarPlanilhaModelo(): Buffer {
  const headers = [
    "Nome",
    "CPF",
    "RG",
    "Data de Nascimento",
    "Sexo",
    "Telefone",
    "Email",
    "Cargo",
    "Categoria",
    "Faixa",
    "Nivel",
    "Jornada",
    "Lotacao",
    "Data de Posse",
    "Data de Exercicio",
    "dting_ctd",
    "dtfimctd",
    "Situacao",
  ];

  const exemplos = [
    [
      "Maria Aparecida Silva Santos",
      "123.456.789-00",
      "12.345.678-9",
      "14/05/1978",
      "Feminino",
      "(17) 99123-4567",
      "maria@educacao.sp.gov.br",
      "Professor de Educação Básica II",
      "Efetivo",
      "A",
      "III",
      "Diurna",
      "EE Profa. Marlene Frattini",
      "01/02/2015",
      "03/02/2015",
      "",
      "",
      "Ativo",
    ],
    [
      "João Pedro Almeida",
      "234.567.890-11",
      "23.456.789-0",
      "22/08/1985",
      "Masculino",
      "(17) 99234-5678",
      "joao@educacao.sp.gov.br",
      "Professor de Educação Básica II",
      "Efetivo",
      "B",
      "II",
      "Diurna",
      "EE Profa. Marlene Frattini",
      "15/03/2018",
      "16/03/2018",
      "",
      "",
      "Ativo",
    ],
    [
      "Ana Carolina Ferreira",
      "345.678.901-22",
      "34.567.890-1",
      "03/11/1990",
      "Feminino",
      "(17) 99345-6789",
      "ana@educacao.sp.gov.br",
      "Agente de Organização Escolar",
      "Contratado",
      "",
      "",
      "Diurna",
      "EE Profa. Marlene Frattini",
      "",
      "11/06/2021",
      "10/06/2021",
      "31/12/2025",
      "Ativo",
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...exemplos]);

  // Larguras das colunas
  ws["!cols"] = headers.map((h) => ({ wch: Math.max(h.length + 2, 18) }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Servidores");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
