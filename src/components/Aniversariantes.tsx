"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/Card";

type Servidor = {
  id: number;
  nomeCompleto: string;
  dataNascimento: string | null;
  cargo: string;
};

type Aniversariante = {
  servidor: Servidor;
  dia: number;
  mes: number;
  idade: number;
  proximo: boolean;
  hoje: boolean;
};

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

function calcularIdade(dataNascimento: string): number {
  const hoje = new Date();
  const nasc = new Date(dataNascimento + "T00:00:00");
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const mesAtual = hoje.getMonth();
  const mesNasc = nasc.getMonth();
  
  if (mesAtual < mesNasc || (mesAtual === mesNasc && hoje.getDate() < nasc.getDate())) {
    idade--;
  }
  
  return idade;
}

function formatarData(dia: number, mes: number): string {
  return `${dia.toString().padStart(2, '0')} de ${MESES[mes]}`;
}

export function Aniversariantes() {
  const [servidores, setServidores] = useState<Servidor[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    async function carregar() {
      try {
        const res = await fetch("/api/servidores");
        if (!res.ok) throw new Error("Erro ao carregar servidores");
        const data = await res.json();
        setServidores(data);
      } catch (err) {
        setErro(err instanceof Error ? err.message : "Erro desconhecido");
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, []);

  if (carregando) {
    return (
      <Card titulo="🎂 Aniversariantes" className="mt-6">
        <p className="text-slate-500 text-sm">Carregando...</p>
      </Card>
    );
  }

  if (erro) {
    return (
      <Card titulo="🎂 Aniversariantes" className="mt-6">
        <p className="text-rose-600 text-sm">⚠️ {erro}</p>
      </Card>
    );
  }

  const hoje = new Date();
  const diaAtual = hoje.getDate();
  const mesAtual = hoje.getMonth();
  const anoAtual = hoje.getFullYear();

  // Processar aniversariantes
  const aniversariantes: Aniversariante[] = servidores
    .filter(s => s.dataNascimento)
    .map(s => {
      const nasc = new Date(s.dataNascimento! + "T00:00:00");
      const dia = nasc.getDate();
      const mes = nasc.getMonth();
      const idade = calcularIdade(s.dataNascimento!);
      
      // Verificar se é hoje
      const eHoje = dia === diaAtual && mes === mesAtual;
      
      // Verificar se é nos próximos 30 dias
      let proximo = false;
      if (!eHoje) {
        const proximoAniversario = new Date(anoAtual, mes, dia);
        if (proximoAniversario < hoje) {
          proximoAniversario.setFullYear(anoAtual + 1);
        }
        const diasAteAniversario = Math.floor((proximoAniversario.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
        proximo = diasAteAniversario <= 30;
      }
      
      return {
        servidor: s,
        dia,
        mes,
        idade,
        proximo,
        hoje: eHoje
      };
    })
    .sort((a, b) => {
      if (a.mes !== b.mes) return a.mes - b.mes;
      return a.dia - b.dia;
    });

  // Filtrar aniversariantes do dia
  const aniversariantesHoje = aniversariantes.filter(a => a.hoje);
  
  // Filtrar aniversariantes do mês
  const aniversariantesMes = aniversariantes.filter(a => a.mes === mesAtual && !a.hoje);
  
  // Filtrar próximos aniversariantes (próximos 30 dias, excluindo hoje e mês atual)
  const proximosAniversariantes = aniversariantes.filter(a => a.proximo && !a.hoje && a.mes !== mesAtual);
  
  // Agrupar por mês
  const porMes = aniversariantes.reduce((acc, a) => {
    if (!acc[a.mes]) acc[a.mes] = [];
    acc[a.mes].push(a);
    return acc;
  }, {} as Record<number, Aniversariante[]>);

  return (
    <Card titulo="🎂 Aniversariantes" className="mt-6">
      <div className="space-y-4">
        {/* Data atual */}
        <div className="bg-sky-50 border border-sky-200 rounded-lg p-3 text-sm">
          <p className="text-sky-900 font-semibold">
            📅 Hoje: {diaAtual} de {MESES[mesAtual]} de {anoAtual}
          </p>
        </div>

        {/* Aniversariantes do dia */}
        {aniversariantesHoje.length > 0 && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4">
            <h3 className="text-lg font-bold text-amber-900 mb-3 flex items-center gap-2">
              🎉 Aniversariantes de Hoje!
            </h3>
            <div className="space-y-2">
              {aniversariantesHoje.map(a => (
                <div key={a.servidor.id} className="bg-white rounded-lg p-3 border border-amber-200">
                  <p className="font-bold text-slate-900">{a.servidor.nomeCompleto}</p>
                  <p className="text-sm text-slate-600">{a.servidor.cargo}</p>
                  <p className="text-sm text-amber-700 font-semibold mt-1">
                    🎂 {a.idade} anos
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Aniversariantes do mês */}
        {aniversariantesMes.length > 0 && (
          <div>
            <h3 className="text-base font-bold text-slate-900 mb-2">
              📅 Aniversariantes de {MESES[mesAtual]}
            </h3>
            <div className="space-y-2">
              {aniversariantesMes.map(a => (
                <div key={a.servidor.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{a.servidor.nomeCompleto}</p>
                    <p className="text-xs text-slate-600">{a.servidor.cargo}</p>
                  </div>
                  <div className="text-right ml-3">
                    <p className="text-sm font-bold text-sky-700">{a.dia}/{(a.mes + 1).toString().padStart(2, '0')}</p>
                    <p className="text-xs text-slate-600">{a.idade} anos</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Próximos aniversariantes */}
        {proximosAniversariantes.length > 0 && (
          <div>
            <h3 className="text-base font-bold text-slate-900 mb-2">
              ⏰ Próximos Aniversariantes (30 dias)
            </h3>
            <div className="space-y-2">
              {proximosAniversariantes.map(a => (
                <div key={a.servidor.id} className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{a.servidor.nomeCompleto}</p>
                    <p className="text-xs text-slate-600">{a.servidor.cargo}</p>
                  </div>
                  <div className="text-right ml-3">
                    <p className="text-sm font-bold text-emerald-700">{formatarData(a.dia, a.mes)}</p>
                    <p className="text-xs text-slate-600">{a.idade + 1} anos</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lista completa por mês */}
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-semibold text-slate-700 hover:text-slate-900">
            📋 Ver todos os aniversariantes por mês
          </summary>
          <div className="mt-3 space-y-4">
            {Object.entries(porMes).map(([mes, lista]) => (
              <div key={mes}>
                <h4 className="text-sm font-bold text-slate-900 mb-2 border-b border-slate-200 pb-1">
                  {MESES[parseInt(mes)]} ({lista.length})
                </h4>
                <div className="space-y-1">
                  {lista.map(a => (
                    <div key={a.servidor.id} className="flex items-center justify-between text-xs p-2 hover:bg-slate-50 rounded">
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-slate-900">{a.servidor.nomeCompleto}</span>
                        <span className="text-slate-500 ml-2">({a.servidor.cargo})</span>
                      </div>
                      <div className="text-right ml-2">
                        <span className="font-semibold text-slate-700">{a.dia}/{(a.mes + 1).toString().padStart(2, '0')}</span>
                        <span className="text-slate-500 ml-2">({a.idade} anos)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </details>

        {/* Resumo */}
        <div className="mt-4 pt-4 border-t border-slate-200 text-xs text-slate-600">
          <p>Total de servidores: {servidores.length}</p>
          <p>Com data de nascimento: {aniversariantes.length}</p>
          <p>Sem data de nascimento: {servidores.length - aniversariantes.length}</p>
        </div>
      </div>
    </Card>
  );
}
