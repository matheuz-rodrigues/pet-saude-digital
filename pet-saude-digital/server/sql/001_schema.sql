-- db.js descarta as linhas de comentario e divide o resto em instrucoes
-- pelo ponto e virgula.

CREATE TABLE IF NOT EXISTS config (
  id TINYINT PRIMARY KEY DEFAULT 1,
  conta_pix VARCHAR(255) NOT NULL DEFAULT '',
  prazo_cancelamento_dias INT NOT NULL DEFAULT 7,
  percentual_reembolso DECIMAL(5,2) NOT NULL DEFAULT 100.00,
  inscricoes_abertas TINYINT NOT NULL DEFAULT 1
);

-- Incremento 1: o sistema deixa de ser de um evento só. Os eventos entram
-- pelo admin, e db.js semeia um exemplo quando a tabela está vazia.
-- Incremento 3: tipo 'simples' é só divulgação, 'completo' tem atividades
-- e inscrição, com taxa própria.
CREATE TABLE IF NOT EXISTS eventos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(180) NOT NULL,
  chamada VARCHAR(280) NOT NULL DEFAULT '',
  descricao TEXT,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  local VARCHAR(180) NOT NULL DEFAULT '',
  tipo VARCHAR(16) NOT NULL DEFAULT 'simples',
  taxa DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  inscricoes_abertas TINYINT NOT NULL DEFAULT 1,
  publicado TINYINT NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Incremento 2: noticias, opcionalmente ligadas a um evento do incremento 1.
CREATE TABLE IF NOT EXISTS noticias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  titulo VARCHAR(180) NOT NULL,
  resumo VARCHAR(280) NOT NULL DEFAULT '',
  conteudo TEXT,
  evento_id INT DEFAULT NULL,
  publicada TINYINT NOT NULL DEFAULT 1,
  publicada_em DATE NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (evento_id) REFERENCES eventos(id) ON DELETE SET NULL
);

-- A conta do participante vale para todos os eventos. Cada evento em que
-- ele se inscreve gera uma linha em inscricoes.
CREATE TABLE IF NOT EXISTS participantes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  numero CHAR(6) NOT NULL UNIQUE,
  nome_completo VARCHAR(180) NOT NULL,
  usa_nome_social TINYINT NOT NULL DEFAULT 0,
  nome_social VARCHAR(180) DEFAULT NULL,
  genero VARCHAR(40) NOT NULL,
  nascimento DATE NOT NULL,
  cpf CHAR(11) NOT NULL UNIQUE,
  email VARCHAR(180) NOT NULL UNIQUE,
  telefone VARCHAR(20) NOT NULL,
  senha_hash VARCHAR(80) NOT NULL,
  aceite_lgpd TINYINT NOT NULL DEFAULT 1,
  asaas_customer_id VARCHAR(64) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Incremento 3: toda atividade pertence a um evento completo. Apagar o
-- evento leva junto as atividades (o admin bloqueia se houver inscritos).
CREATE TABLE IF NOT EXISTS atividades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  evento_id INT NOT NULL,
  data DATE NOT NULL,
  horario VARCHAR(40) NOT NULL DEFAULT '',
  tipo VARCHAR(32) NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  preco_extra DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  vagas INT NULL,
  ordem INT NOT NULL DEFAULT 0,
  FOREIGN KEY (evento_id) REFERENCES eventos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS inscricoes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  participante_id INT NOT NULL,
  evento_id INT NOT NULL,
  status ENUM('rascunho','aguardando_pix','aguardando_gratuidade','pago','cancelada') NOT NULL DEFAULT 'aguardando_pix',
  valor DECIMAL(10,2) NOT NULL,
  asaas_payment_id VARCHAR(64) DEFAULT NULL,
  pix_payload TEXT,
  pix_qrcode TEXT,
  pix_expira_em DATETIME DEFAULT NULL,
  gratuidade_motivo TEXT,
  credenciado_em DATETIME DEFAULT NULL,
  cancelada_em DATETIME DEFAULT NULL,
  cancelada_por VARCHAR(20) DEFAULT NULL,
  status_antes_cancelar VARCHAR(40) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uma_por_evento (participante_id, evento_id),
  FOREIGN KEY (participante_id) REFERENCES participantes(id),
  FOREIGN KEY (evento_id) REFERENCES eventos(id)
);

CREATE TABLE IF NOT EXISTS inscricao_atividades (
  inscricao_id INT NOT NULL,
  atividade_id INT NOT NULL,
  PRIMARY KEY (inscricao_id, atividade_id),
  FOREIGN KEY (inscricao_id) REFERENCES inscricoes(id) ON DELETE CASCADE,
  FOREIGN KEY (atividade_id) REFERENCES atividades(id)
);

CREATE TABLE IF NOT EXISTS webhook_eventos (
  id VARCHAR(128) PRIMARY KEY,
  payment_id VARCHAR(64) DEFAULT NULL,
  tipo VARCHAR(64) DEFAULT NULL,
  recebido_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
)
