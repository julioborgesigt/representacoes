-- ============================================================
--  SISTEMA DE GERENCIAMENTO DE REPRESENTAÇÕES POLICIAIS
--  schema.sql — MariaDB / MySQL
--  Execute este arquivo UMA VEZ no deploy inicial.
-- ============================================================

SET NAMES utf8mb4;
SET foreign_key_checks = 0;

-- ------------------------------------------------------------
-- TABELAS DE DOMÍNIO (listas estáticas)
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS varas (
    id   TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(60) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS crimes (
    id   TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(80) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cidades (
    id   TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(60) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tipos_pedido (
    id   TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS status_pedido (
    id    TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nome  VARCHAR(60)  NOT NULL UNIQUE,
    cor   VARCHAR(7)   NOT NULL COMMENT 'Hex CSS (#RRGGBB)',
    ordem TINYINT UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- USUÁRIOS DO SISTEMA
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS usuarios (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nome          VARCHAR(120) NOT NULL,
    login         VARCHAR(60)  NOT NULL UNIQUE,
    senha_hash    VARCHAR(255) NOT NULL COMMENT 'bcrypt hash',
    perfil        ENUM('admin','operador') NOT NULL DEFAULT 'operador',
    ativo         TINYINT(1) NOT NULL DEFAULT 1,
    criado_em     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- REPRESENTAÇÕES (tabela principal)
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS representacoes (
    id                   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    -- Identificadores
    numero_processo      VARCHAR(50)  NOT NULL,
    numero_ip            VARCHAR(50)  NOT NULL,

    -- Origem & Destino
    vara_id              TINYINT UNSIGNED NOT NULL,
    peticionante         VARCHAR(120) NOT NULL,

    -- Classificação
    crime_id             TINYINT UNSIGNED NOT NULL,
    cidade_id            TINYINT UNSIGNED NOT NULL,

    -- Tipo de Pedido
    tipo_pedido_id       TINYINT UNSIGNED NOT NULL,

    -- Controle de Alvos
    qtd_alvos_pedido     SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    qtd_alvos_total      SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    -- Segurança
    tipo_sigilo          ENUM('segredo_justica','sigilo_absoluto') NOT NULL,
    senha_processo       VARCHAR(100) NULL COMMENT 'NULL = sem senha',

    -- Controle Temporal
    data_envio           DATE NOT NULL,
    data_ultima_verificacao DATE NULL,

    -- Situação
    status_id            TINYINT UNSIGNED NOT NULL,

    -- Metadados
    criado_por           INT UNSIGNED NULL,
    criado_em            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                             ON UPDATE CURRENT_TIMESTAMP,

    -- Chaves Estrangeiras
    CONSTRAINT fk_rep_vara       FOREIGN KEY (vara_id)        REFERENCES varas(id),
    CONSTRAINT fk_rep_crime      FOREIGN KEY (crime_id)       REFERENCES crimes(id),
    CONSTRAINT fk_rep_cidade     FOREIGN KEY (cidade_id)      REFERENCES cidades(id),
    CONSTRAINT fk_rep_tipo       FOREIGN KEY (tipo_pedido_id) REFERENCES tipos_pedido(id),
    CONSTRAINT fk_rep_status     FOREIGN KEY (status_id)      REFERENCES status_pedido(id),
    CONSTRAINT fk_rep_usuario    FOREIGN KEY (criado_por)     REFERENCES usuarios(id)
                                     ON DELETE SET NULL,

    INDEX idx_data_envio  (data_envio),
    INDEX idx_status      (status_id),
    INDEX idx_vara        (vara_id),
    INDEX idx_crime       (crime_id),
    INDEX idx_cidade      (cidade_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET foreign_key_checks = 1;

-- ============================================================
-- DADOS INICIAIS
-- ============================================================

-- Varas
INSERT IGNORE INTO varas (nome) VALUES
    ('Fortaleza'),
    ('2º Núcleo'),
    ('1ª VC'),
    ('Plantão');

-- Crimes
INSERT IGNORE INTO crimes (nome) VALUES
    ('Tráfico de drogas'),
    ('Orcrim'),
    ('Homicídio'),
    ('SN Armas'),
    ('Roubo'),
    ('Latrocínio');

-- Cidades
INSERT IGNORE INTO cidades (nome) VALUES
    ('Iguatu'),
    ('Quixelô');

-- Tipos de Pedido
INSERT IGNORE INTO tipos_pedido (nome) VALUES
    ('Prisão preventiva'),
    ('Prisão temporária'),
    ('Busca e apreensão de menoridade'),
    ('Busca e apreensão de objetos'),
    ('Quebra de sigilo telemático'),
    ('Quebra de sigilo bancário');

-- Status do Pedido (nome, cor hex, ordem de exibição)
INSERT IGNORE INTO status_pedido (nome, cor, ordem) VALUES
    ('Remetido',               '#93C5FD', 1),  -- azul claro
    ('Parecer MP',             '#FDE68A', 2),  -- amarelo claro
    ('Apreciação Judicial',    '#FDBA74', 3),  -- laranja claro
    ('Decisão Judicial',       '#86EFAC', 4),  -- verde claro
    ('Pendente de cumprimento','#F9A8D4', 5),  -- rosa claro
    ('Cumprido',               '#A5B4FC', 6),  -- índigo claro
    ('Concluído',              '#D1D5DB', 7),  -- cinza (esmaecido)
    ('Negado',                 '#FCA5A5', 8);  -- vermelho claro

-- ============================================================
-- USUÁRIO ADMINISTRADOR PADRÃO
-- Senha: Admin@123
-- Hash bcrypt (rounds=10) gerado offline para deploy seguro.
-- ALTERE A SENHA NO PRIMEIRO ACESSO!
-- ============================================================
INSERT IGNORE INTO usuarios (nome, login, senha_hash, perfil) VALUES (
    'Administrador',
    'admin',
    '$2b$10$YzQ4ZGM2NjYxZDE0ZGU4OOeLKAQoGtqQ7Mpm7q.yHSmFbWHHt8lIS',
    'admin'
);
