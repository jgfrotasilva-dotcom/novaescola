-- Schema completo para Supabase
-- Execute este SQL no Supabase SQL Editor

-- Users (autenticação)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  matricula VARCHAR(32) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL,
  nome VARCHAR(200) NOT NULL,
  papel VARCHAR(20) NOT NULL,
  servidor_id INTEGER,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Servidores
CREATE TABLE IF NOT EXISTS servidores (
  id SERIAL PRIMARY KEY,
  nome_completo VARCHAR(200) NOT NULL,
  cpf VARCHAR(14) NOT NULL UNIQUE,
  rg VARCHAR(30),
  data_nascimento DATE,
  sexo VARCHAR(20),
  email VARCHAR(200),
  telefone VARCHAR(30),
  endereco TEXT,
  matricula VARCHAR(32) NOT NULL UNIQUE,
  cargo VARCHAR(120) NOT NULL,
  categoria VARCHAR(120),
  faixa VARCHAR(60),
  nivel VARCHAR(60),
  funcao VARCHAR(120),
  lotacao VARCHAR(120) NOT NULL DEFAULT 'EE Profa. Marlene Frattini',
  unidade_exercicio VARCHAR(200),
  regime_juridico VARCHAR(80),
  carga_horaria INTEGER,
  jornada VARCHAR(60),
  escolaridade VARCHAR(80),
  data_admissao DATE NOT NULL,
  data_posse DATE,
  data_exercicio DATE,
  dt_ing_ctd DATE,
  dt_fim_ctd DATE,
  situacao VARCHAR(40) NOT NULL DEFAULT 'Ativo',
  observacoes TEXT,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tipos de Vantagem
CREATE TABLE IF NOT EXISTS tipos_vantagem (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(20) NOT NULL UNIQUE,
  nome VARCHAR(120) NOT NULL,
  descricao TEXT,
  base_calculo VARCHAR(40),
  ativo BOOLEAN NOT NULL DEFAULT true
);

-- Servidor Vantagens
CREATE TABLE IF NOT EXISTS servidor_vantagens (
  id SERIAL PRIMARY KEY,
  servidor_id INTEGER NOT NULL REFERENCES servidores(id) ON DELETE CASCADE,
  tipo_vantagem_id INTEGER NOT NULL REFERENCES tipos_vantagem(id) ON DELETE RESTRICT,
  percentual NUMERIC(8,2),
  valor_fixo NUMERIC(12,2),
  data_inicio DATE NOT NULL,
  data_fim DATE,
  fundamento_legal VARCHAR(200),
  observacao TEXT,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Histórico Funcional
CREATE TABLE IF NOT EXISTS historico_funcional (
  id SERIAL PRIMARY KEY,
  servidor_id INTEGER NOT NULL REFERENCES servidores(id) ON DELETE CASCADE,
  data_ocorrencia DATE NOT NULL,
  tipo_evento VARCHAR(60) NOT NULL,
  descricao TEXT NOT NULL,
  ato_legal VARCHAR(200),
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Afastamentos
CREATE TABLE IF NOT EXISTS afastamentos (
  id SERIAL PRIMARY KEY,
  servidor_id INTEGER NOT NULL REFERENCES servidores(id) ON DELETE CASCADE,
  tipo VARCHAR(80) NOT NULL,
  data_inicio DATE NOT NULL,
  data_fim DATE,
  dias INTEGER,
  motivo TEXT,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Config Vantagens Pessoais
CREATE TABLE IF NOT EXISTS config_vantagens_pessoais (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(20) NOT NULL UNIQUE,
  nome VARCHAR(120) NOT NULL,
  descricao TEXT,
  percentual_por_periodo NUMERIC(5,2) NOT NULL,
  periodicidade_anos INTEGER NOT NULL,
  maximo_periodos INTEGER,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Servidor ATS
CREATE TABLE IF NOT EXISTS servidor_ats (
  id SERIAL PRIMARY KEY,
  servidor_id INTEGER NOT NULL REFERENCES servidores(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL,
  data_vigencia DATE NOT NULL,
  data_doe DATE,
  percentual NUMERIC(5,2) NOT NULL DEFAULT '5.00',
  eh_ultimo BOOLEAN NOT NULL DEFAULT false,
  proxima_vigencia DATE,
  observacao TEXT,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Licença Prêmio Certidões
CREATE TABLE IF NOT EXISTS licenca_premio_certidoes (
  id SERIAL PRIMARY KEY,
  servidor_id INTEGER NOT NULL REFERENCES servidores(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL,
  ano INTEGER NOT NULL,
  periodo_inicial DATE NOT NULL,
  periodo_final DATE NOT NULL,
  data_doe DATE,
  saldo_inicial INTEGER NOT NULL DEFAULT 90,
  observacao TEXT,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Licença Prêmio Fruições
CREATE TABLE IF NOT EXISTS licenca_premio_fruicoes (
  id SERIAL PRIMARY KEY,
  certidao_id INTEGER NOT NULL REFERENCES licenca_premio_certidoes(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL,
  dias INTEGER NOT NULL,
  data_inicio DATE,
  data_fim DATE,
  data_doe_autorizacao DATE,
  ano_pecunia INTEGER,
  observacao TEXT,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Regras Evolução
CREATE TABLE IF NOT EXISTS regras_evolucao (
  id SERIAL PRIMARY KEY,
  tipo_cargo VARCHAR(20) NOT NULL,
  nivel_origem VARCHAR(5) NOT NULL,
  nivel_destino VARCHAR(5) NOT NULL,
  intersticio_anos INTEGER NOT NULL,
  pontuacao_minima INTEGER NOT NULL,
  pontuacao_atualizacao INTEGER NOT NULL,
  pontuacao_aprimoramento INTEGER NOT NULL,
  pontuacao_producao INTEGER NOT NULL
);

-- Evolução Funcional
CREATE TABLE IF NOT EXISTS evolucao_funcional (
  id SERIAL PRIMARY KEY,
  servidor_id INTEGER NOT NULL REFERENCES servidores(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL,
  nivel_anterior VARCHAR(5) NOT NULL,
  nivel_posterior VARCHAR(5) NOT NULL,
  data_vigencia DATE NOT NULL,
  data_doe DATE,
  pontuacao_total INTEGER,
  pontuacao_atualizacao INTEGER,
  pontuacao_aprimoramento INTEGER,
  pontuacao_producao INTEGER,
  intersticio_anos INTEGER,
  ultima_evolucao DATE,
  proxima_data DATE,
  data_calculada DATE,
  data_efetiva DATE,
  intervencao TEXT,
  justificativa TEXT,
  responsavel VARCHAR(200),
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS users_matricula_idx ON users(matricula);
