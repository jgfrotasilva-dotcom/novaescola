"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Card, Campo } from "@/components/Card";
import { formatarData, formatarCPF, formatarMoeda, calcularTempoServico, situacaoCor } from "@/lib/format";

type Servidor = {
  id: number;
  nomeCompleto: string;
  cpf: string;
  rg: string | null;
  dataNascimento: string | null;
  sexo: string | null;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  matricula: string;
  cargo: string;
  categoria: string | null;
  faixa: string | null;
  nivel: string | null;
  funcao: string | null;
  lotacao: string;
  unidadeExercicio: string | null;
  regimeJuridico: string | null;
  cargaHoraria: number | null;
  jornada: string | null;
  escolaridade: string | null;
  dataAdmissao: string;
  dataPosse: string | null;
  dataExercicio: string | null;
  dtingCtd: string | null;
  dtfimCtd: string | null;
  situacao: string;
  observacoes: string | null;
};

type Vantagem = {
  id: number;
  tipoNome: string;
  tipoCodigo: string;
  tipoBaseCalculo: string | null;
  percentual: string | null;
  valorFixo: string | null;
  dataInicio: string;
  dataFim: string | null;
  fundamentoLegal: string | null;
  observacao: string | null;
};

type Historico = {
  id: number;
  dataOcorrencia: string;
  tipoEvento: string;
  descricao: string;
  atoLegal: string | null;
};

type Afastamento = {
  id: number;
  tipo: string;
  dataInicio: string;
  dataFim: string | null;
  dias: number | null;
  motivo: string | null;
};

export default function ServidorPage() {
  const router = useRouter();
  const [sessao, setSessao] = useState<{ nome: string; papel: "servidor"; servidorId: number | null } | null>(null);
  const [servidor, setServidor] = useState<Servidor | null>(null);
  const [vantagens, setVantagens] = useState<Vantagem[]>([]);
  const [historico, setHistorico] = useState<Historico[]>([]);
  const [afastamentos, setAfastamentos] = useState<Afastamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      try {
        const ctrl = new AbortController();
        const timeout = setTimeout(() => ctrl.abort(), 10000);
        const res = await fetch("/api/auth", { signal: ctrl.signal });
        clearTimeout(timeout);
        const auth = await res.json();
        if (!ativo) return;

        if (!auth.logado) {
          router.replace("/login?papel=servidor");
          return;
        }
        if (auth.papel !== "servidor") {
          router.replace("/gestor");
          return;
        }
        setSessao(auth);

        const sid = auth.servidorId;
        const [sRes, vRes, hRes] = await Promise.all([
          fetch(`/api/servidores?id=${sid}`),
          fetch(`/api/vantagens?servidorId=${sid}`),
          fetch(`/api/historico?servidorId=${sid}`),
        ]);
        if (!ativo) return;
        const s = await sRes.json();
        const v = await vRes.json();
        const h = await hRes.json();
        if (!ativo) return;
        setServidor(s);
        setVantagens(v);
        setHistorico(h.historico || []);
        setAfastamentos(h.afastamentos || []);
        setCarregando(false);
      } catch (err) {
        if (!ativo) return;
        setErro("Não foi possível carregar sua ficha. Verifique sua conexão e tente novamente.");
        setCarregando(false);
      }
    }
    carregar();
    return () => { ativo = false; };
  }, [router]);

  if (erro) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md bg-white rounded-2xl shadow-lg border border-rose-200 p-8 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-rose-100 flex items-center justify-center text-3xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Problema de conexão</h2>
          <p className="text-slate-600 mb-5">{erro}</p>
          <div className="flex gap-2 justify-center flex-wrap">
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-xl bg-sky-700 hover:bg-sky-800 text-white font-semibold transition"
            >
              Tentar novamente
            </button>
            <Link href="/" className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition">
              Voltar ao início
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (carregando || !servidor || !sessao) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto border-4 border-sky-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-600">Carregando sua ficha funcional...</p>
        </div>
      </div>
    );
  }

  const somaPercentual = vantagens
    .filter((v) => v.tipoBaseCalculo === "percentual" && v.percentual)
    .reduce((acc, v) => acc + parseFloat(v.percentual || "0"), 0);
  const somaFixa = vantagens
    .filter((v) => v.tipoBaseCalculo === "valor_fixo" && v.valorFixo)
    .reduce((acc, v) => acc + parseFloat(v.valorFixo || "0"), 0);
  const vantagensAtivas = vantagens.filter((v) => !v.dataFim).length;

  return (
    <div className="min-h-screen print-container">
      <Header nome={sessao.nome} papel="servidor" voltarPara="/" />

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Barra de ações */}
        <div className="no-print flex items-center justify-between mb-6 gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Minha Vida Funcional</h1>
            <p className="text-sm text-slate-500 mt-1">
              Ficha completa · Atualizada em {new Date().toLocaleDateString("pt-BR")}
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-700 hover:bg-sky-800 text-white rounded-xl font-semibold shadow-sm transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path d="M6 9V2h12v7" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Imprimir ficha
          </button>
        </div>

        {/* Cards de estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
          <StatCard label="Tempo de Serviço" valor={calcularTempoServico(servidor.dataAdmissao)} icone="⏱️" cor="sky" />
          <StatCard label="Vantagens Ativas" valor={String(vantagensAtivas)} icone="✨" cor="emerald" />
          <StatCard label="Total em %" valor={`${formatarMoeda(somaPercentual)}%`} icone="📊" cor="indigo" />
          <StatCard label="Eventos" valor={String(historico.length)} icone="📅" cor="amber" />
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          {/* Dados pessoais */}
          <Card titulo="👤 Dados Pessoais" className="lg:col-span-2">
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <Campo label="Nome Completo">{servidor.nomeCompleto}</Campo>
              <Campo label="CPF">{formatarCPF(servidor.cpf)}</Campo>
              <Campo label="RG">{servidor.rg}</Campo>
              <Campo label="Data de Nascimento">{formatarData(servidor.dataNascimento)}</Campo>
              <Campo label="E-mail">{servidor.email}</Campo>
              <Campo label="Telefone">{servidor.telefone}</Campo>
              <div className="md:col-span-2">
                <Campo label="Endereço">{servidor.endereco}</Campo>
              </div>
            </dl>
          </Card>

          {/* Situação */}
          <Card titulo="📍 Situação Atual">
            <div className="text-center py-2">
              <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-bold ring-1 ${situacaoCor(servidor.situacao)}`}>
                {servidor.situacao}
              </span>
            </div>
            <dl className="space-y-3 mt-4">
              <Campo label="Lotação">{servidor.lotacao}</Campo>
              <Campo label="Unidade de Exercício">{servidor.unidadeExercicio}</Campo>
              <Campo label="Regime Jurídico">{servidor.regimeJuridico}</Campo>
            </dl>
          </Card>

          {/* Dados funcionais */}
          <Card titulo="💼 Dados Funcionais" className="lg:col-span-3">
            <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
              <Campo label="Matrícula">{servidor.matricula}</Campo>
              <Campo label="Cargo">{servidor.cargo}</Campo>
              <Campo label="Função">{servidor.funcao}</Campo>
              <Campo label="Categoria">{servidor.categoria}</Campo>
              <Campo label="Faixa">{servidor.faixa}</Campo>
              <Campo label="Nível">{servidor.nivel}</Campo>
              <Campo label="Escolaridade">{servidor.escolaridade}</Campo>
              <Campo label="Carga Horária">{servidor.cargaHoraria ? `${servidor.cargaHoraria}h semanais` : "—"}</Campo>
              <Campo label="Jornada">{servidor.jornada}</Campo>
              <Campo label="Data de Admissão">{formatarData(servidor.dataAdmissao)}</Campo>
              <Campo label="Data de Posse">{formatarData(servidor.dataPosse)}</Campo>
              <Campo label="Data de Exercício">{formatarData(servidor.dataExercicio)}</Campo>
              <Campo label="Ingresso CTD">{formatarData(servidor.dtingCtd)}</Campo>
              <Campo label="Fim CTD">{formatarData(servidor.dtfimCtd)}</Campo>
            </dl>
            {servidor.observacoes && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-1">Observações</dt>
                <dd className="text-sm text-slate-700">{servidor.observacoes}</dd>
              </div>
            )}
          </Card>

          {/* Vantagens */}
          <Card
            titulo="✨ Vantagens Adquiridas"
            subtitulo={`${vantagens.length} registro${vantagens.length !== 1 ? "s" : ""}`}
            className="lg:col-span-2"
          >
            {vantagens.length === 0 ? (
              <p className="text-slate-500 text-sm">Nenhuma vantagem registrada.</p>
            ) : (
              <div className="overflow-x-auto -mx-5 md:-mx-6">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-100">
                    <tr>
                      <th className="px-5 md:px-6 py-2">Vantagem</th>
                      <th className="px-3 py-2">Valor</th>
                      <th className="px-3 py-2">Início</th>
                      <th className="px-3 py-2">Fundamento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vantagens.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50">
                        <td className="px-5 md:px-6 py-3">
                          <div className="font-semibold text-slate-900">{v.tipoNome}</div>
                          <div className="text-xs text-slate-500">{v.tipoCodigo}</div>
                        </td>
                        <td className="px-3 py-3 font-semibold text-sky-700">
                          {v.tipoBaseCalculo === "percentual"
                            ? `${formatarMoeda(v.percentual)}%`
                            : v.valorFixo
                            ? `R$ ${formatarMoeda(v.valorFixo)}`
                            : "—"}
                        </td>
                        <td className="px-3 py-3 text-slate-600">{formatarData(v.dataInicio)}</td>
                        <td className="px-3 py-3 text-slate-600 text-xs max-w-[200px]">{v.fundamentoLegal || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {somaPercentual > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between text-sm">
                <span className="text-slate-600">Total percentual acumulado</span>
                <span className="font-bold text-slate-900">{formatarMoeda(somaPercentual)}%</span>
              </div>
            )}
          </Card>

          {/* Afastamentos */}
          <Card titulo="🏥 Afastamentos" subtitulo={`${afastamentos.length} registro${afastamentos.length !== 1 ? "s" : ""}`}>
            {afastamentos.length === 0 ? (
              <p className="text-slate-500 text-sm">Nenhum afastamento registrado.</p>
            ) : (
              <ul className="space-y-3">
                {afastamentos.map((a) => (
                  <li key={a.id} className="pb-3 border-b border-slate-100 last:border-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900 text-sm">{a.tipo}</span>
                      {a.dias && <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">{a.dias} dias</span>}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {formatarData(a.dataInicio)} {a.dataFim ? `→ ${formatarData(a.dataFim)}` : "(em andamento)"}
                    </p>
                    {a.motivo && <p className="text-xs text-slate-600 mt-1">{a.motivo}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* ATS */}
          <Card titulo="🎖️ ATS - Adicional por Tempo de Serviço" className="lg:col-span-3">
            <AtsResumo servidorId={servidor.id} />
          </Card>

          {/* Licença Prêmio */}
          <Card titulo="🏖️ Licença Prêmio" className="lg:col-span-3">
            <LicencaPremioResumo servidorId={servidor.id} />
          </Card>

          {/* Evolução Funcional */}
          <Card titulo="📈 Evolução Funcional" className="lg:col-span-3">
            <EvolucaoResumo servidorId={servidor.id} />
          </Card>

          {/* Histórico */}
          <Card titulo="📜 Histórico Funcional" className="lg:col-span-3">
            {historico.length === 0 ? (
              <p className="text-slate-500 text-sm">Nenhum evento registrado.</p>
            ) : (
              <ol className="relative border-l-2 border-sky-200 ml-3 space-y-5">
                {historico.map((h) => (
                  <li key={h.id} className="pl-6">
                    <span className="absolute -left-[9px] w-4 h-4 bg-sky-600 rounded-full ring-4 ring-sky-100"></span>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded">
                        {formatarData(h.dataOcorrencia)}
                      </span>
                      <span className="font-bold text-slate-900 text-sm">{h.tipoEvento}</span>
                    </div>
                    <p className="text-sm text-slate-700 mt-1">{h.descricao}</p>
                    {h.atoLegal && <p className="text-xs text-slate-500 mt-1">📄 {h.atoLegal}</p>}
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>

        {/* Rodapé da impressão */}
        <div className="mt-10 text-xs text-slate-500 text-center">
          Documento gerado em {new Date().toLocaleString("pt-BR")} · EE Profa. Marlene Frattini
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, valor, icone, cor }: { label: string; valor: string; icone: string; cor: "sky" | "emerald" | "indigo" | "amber" }) {
  const cores = {
    sky: "from-sky-500 to-sky-600",
    emerald: "from-emerald-500 to-emerald-600",
    indigo: "from-indigo-500 to-indigo-600",
    amber: "from-amber-500 to-amber-600",
  };
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 print-card">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cores[cor]} text-white flex items-center justify-center text-lg mb-2`}>
        {icone}
      </div>
      <p className="text-xs text-slate-500 font-medium">{label}</p>
      <p className="text-lg md:text-xl font-bold text-slate-900 mt-0.5 leading-tight">{valor}</p>
    </div>
  );
}

// ============================================================
// RESUMO ATS
// ============================================================
function AtsResumo({ servidorId }: { servidorId: number }) {
  const [dados, setDados] = useState<any>(null);
  useEffect(() => {
    fetch(`/api/vantagens-pessoais?tipo=ats&servidorId=${servidorId}`)
      .then((r) => r.json())
      .then(setDados)
      .catch(() => setDados(null));
  }, [servidorId]);

  if (!dados) return <p className="text-slate-500 text-sm">Carregando...</p>;
  if (!dados.servidor?.podeTerAts) {
    return <p className="text-slate-500 text-sm">Servidor sem direito ao ATS.</p>;
  }
  if (!dados.ats || dados.ats.length === 0) {
    return <p className="text-slate-500 text-sm">Nenhum ATS registrado.</p>;
  }

  const totalPercentual = dados.ats.reduce((acc: number, a: any) => acc + parseFloat(a.percentual || "0"), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p className="text-sm text-slate-600">
          <strong className="text-slate-900">{dados.total}</strong> ATS registrado(s) · Total:{" "}
          <strong className="text-emerald-700">{formatarMoeda(totalPercentual)}%</strong>
        </p>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {dados.ats.map((ats: any) => (
          <div
            key={ats.id}
            className={`p-3 rounded-xl border ${
              ats.ehUltimo
                ? "bg-emerald-50 border-emerald-200 ring-1 ring-emerald-100"
                : "bg-slate-50 border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-slate-900">{ats.numero}º ATS</span>
              {ats.ehUltimo && (
                <span className="text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                  ÚLTIMO
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">Vigência: {formatarData(ats.dataVigencia)}</p>
            {ats.dataDoe && <p className="text-xs text-slate-500">DOE: {formatarData(ats.dataDoe)}</p>}
            <p className="text-sm font-bold text-emerald-700 mt-1">+{formatarMoeda(ats.percentual)}%</p>
            {ats.ehUltimo && ats.proximaVigencia && (
              <p className="text-xs text-sky-700 mt-2 bg-white/60 rounded p-1.5">
                📅 Próximo: <strong>{formatarData(ats.proximaVigencia)}</strong>
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// RESUMO LICENÇA PRÊMIO
// ============================================================
function LicencaPremioResumo({ servidorId }: { servidorId: number }) {
  const [dados, setDados] = useState<any>(null);
  useEffect(() => {
    fetch(`/api/licenca-premio?tipo=certidoes&servidorId=${servidorId}`)
      .then((r) => r.json())
      .then(setDados)
      .catch(() => setDados(null));
  }, [servidorId]);

  if (!dados) return <p className="text-slate-500 text-sm">Carregando...</p>;
  if (!dados.servidor?.podeTerLicencaPremio) {
    return <p className="text-slate-500 text-sm">Servidor sem direito à Licença Prêmio.</p>;
  }
  if (!dados.certidoes || dados.certidoes.length === 0) {
    return <p className="text-slate-500 text-sm">Nenhuma certidão registrada.</p>;
  }

  const saldoTotal = dados.certidoes.reduce((acc: number, c: any) => acc + c.saldoAtual, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p className="text-sm text-slate-600">
          <strong className="text-slate-900">{dados.certidoes.length}</strong> certidão · Saldo total:{" "}
          <strong className="text-indigo-700">{saldoTotal} dias</strong>
        </p>
      </div>
      <div className="space-y-3">
        {dados.certidoes.map((c: any) => {
          const zerada = c.saldoAtual === 0;
          const percentConsumido = ((c.saldoConsumido / c.saldoInicial) * 100).toFixed(0);
          return (
            <div
              key={c.id}
              className={`p-4 rounded-xl border ${zerada ? "bg-slate-50 border-slate-200" : "bg-indigo-50 border-indigo-200"}`}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                <div>
                  <p className="font-bold text-slate-900">
                    Certidão nº {c.numero}/{c.ano}
                    {zerada && (
                      <span className="ml-2 text-[10px] font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">
                        ZERADA
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500">
                    Período: {formatarData(c.periodoInicial)} → {formatarData(c.periodoFinal)}
                  </p>
                </div>
                <p className="text-2xl font-bold text-indigo-700">
                  {c.saldoAtual}<span className="text-xs font-normal text-slate-500">/{c.saldoInicial}d</span>
                </p>
              </div>
              <div className="h-1.5 bg-white rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full ${zerada ? "bg-rose-400" : "bg-indigo-500"}`}
                  style={{ width: `${percentConsumido}%` }}
                ></div>
              </div>
              {c.fruicoes && c.fruicoes.length > 0 && (
                <div className="mt-2 space-y-1">
                  {c.fruicoes.map((f: any) => (
                    <div key={f.id} className="flex items-center justify-between text-xs bg-white/60 rounded px-2 py-1">
                      <span className={`font-bold ${f.tipo === "gozo" ? "text-sky-700" : "text-amber-700"}`}>
                        {f.tipo === "gozo" ? "🏖️ GOZO" : "💰 PECÚNIA"}
                      </span>
                      <span className="text-slate-700">
                        {f.dias}d {f.tipo === "gozo" ? `· ${formatarData(f.dataInicio)}` : `· ano ${f.anoPecunia}`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// RESUMO EVOLUÇÃO FUNCIONAL
// ============================================================
function EvolucaoResumo({ servidorId }: { servidorId: number }) {
  const [dados, setDados] = useState<any>(null);
  useEffect(() => {
    fetch(`/api/evolucao-funcional?tipo=evolucoes&servidorId=${servidorId}`)
      .then((r) => r.json())
      .then(setDados)
      .catch(() => setDados(null));
  }, [servidorId]);

  if (!dados) return <p className="text-slate-500 text-sm">Carregando...</p>;
  if (!dados.servidor?.elegivelCargo || !dados.servidor?.elegivelCategoria) {
    return <p className="text-slate-500 text-sm">{dados.servidor?.motivoInelegibilidade || "Servidor sem direito à Evolução Funcional."}</p>;
  }
  if (!dados.evolucoes || dados.evolucoes.length === 0) {
    return (
      <div>
        <p className="text-slate-500 text-sm mb-2">Nenhuma evolução registrada.</p>
        {dados.proximaRegra && (
          <p className="text-xs text-emerald-700 bg-emerald-50 rounded-lg p-3">
            📈 Próxima evolução prevista: <strong>{dados.proximaRegra.nivelOrigem} → {dados.proximaRegra.nivelDestino}</strong>
            {dados.proximaDataSugerida && (
              <> · Data: <strong>{formatarData(dados.proximaDataSugerida)}</strong></>
            )}
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p className="text-sm text-slate-600">
          <strong className="text-slate-900">{dados.total}</strong> evolução(ões) · Nível atual:{" "}
          <strong className="text-emerald-700">{dados.servidor.nivel || "—"}</strong>
        </p>
      </div>
      <div className="space-y-2">
        {dados.evolucoes.map((ev: any) => (
          <div key={ev.id} className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
            <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
              {ev.numero}ª
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-900">
                Nível {ev.nivelAnterior} → {ev.nivelPosterior}
              </p>
              <p className="text-xs text-slate-500">
                Vigência: {formatarData(ev.dataVigencia)} · {ev.pontuacaoTotal} pts · {ev.intersticioAnos} anos
              </p>
            </div>
          </div>
        ))}
      </div>
      {dados.proximaRegra && (
        <p className="text-xs text-sky-700 bg-sky-50 rounded-lg p-3 mt-3">
          📅 Próxima: <strong>{dados.proximaRegra.nivelOrigem} → {dados.proximaRegra.nivelDestino}</strong>
          {dados.proximaDataSugerida && <> · Prevista: <strong>{formatarData(dados.proximaDataSugerida)}</strong></>}
        </p>
      )}
    </div>
  );
}
