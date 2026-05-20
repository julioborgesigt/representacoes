import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import pool from './pool.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlPath   = join(__dirname, '..', '..', 'schema.sql');

function connConfig(extra = {}) {
    if (process.env.DATABASE_URL) return { uri: process.env.DATABASE_URL, ...extra };
    return {
        host:     process.env.DB_HOST || 'localhost',
        port:     Number(process.env.DB_PORT) || 3306,
        database: process.env.DB_NAME,
        user:     process.env.DB_USER,
        password: process.env.DB_PASS,
        ...extra,
    };
}

export async function initDB() {
    // ── Primeira execução: cria todas as tabelas ─────────────────────────────
    const [[{ count }]] = await pool.query(
        `SELECT COUNT(*) AS count FROM information_schema.tables
         WHERE table_schema = DATABASE() AND table_name = 'representacoes'`
    );

    if (Number(count) === 0) {
        console.log('[DB] Primeira execução — criando tabelas e dados iniciais...');
        const conn = await mysql.createConnection(connConfig({ multipleStatements: true }));
        const sql  = readFileSync(sqlPath, 'utf8');
        await conn.query(sql);
        await conn.end();
        console.log('[DB] Tabelas criadas.');
    }

    // ── Migração: representacao_pedidos (para deploys existentes) ────────────
    const [[{ temPedidos }]] = await pool.query(
        `SELECT COUNT(*) AS temPedidos FROM information_schema.tables
         WHERE table_schema = DATABASE() AND table_name = 'representacao_pedidos'`
    );

    if (Number(temPedidos) === 0) {
        console.log('[DB] Migrando: criando tabela representacao_pedidos...');
        await pool.query(`
            CREATE TABLE representacao_pedidos (
                id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                representacao_id INT UNSIGNED NOT NULL,
                tipo_pedido_id   TINYINT UNSIGNED NOT NULL,
                qtd_alvos        SMALLINT UNSIGNED NOT NULL DEFAULT 0,
                CONSTRAINT fk_rp_rep  FOREIGN KEY (representacao_id) REFERENCES representacoes(id) ON DELETE CASCADE,
                CONSTRAINT fk_rp_tipo FOREIGN KEY (tipo_pedido_id)   REFERENCES tipos_pedido(id),
                INDEX idx_rp_rep (representacao_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        // Migra dados existentes se a coluna tipo_pedido_id ainda existir
        await pool.query(`
            INSERT IGNORE INTO representacao_pedidos (representacao_id, tipo_pedido_id, qtd_alvos)
            SELECT id, tipo_pedido_id, COALESCE(qtd_alvos_pedido, 0)
            FROM representacoes
            WHERE tipo_pedido_id IS NOT NULL
        `).catch(() => {}); // coluna pode não existir em instalações novas
        console.log('[DB] Migração concluída.');
    }

    // ── Migração: renomear tipos_pedido para nomenclatura do judiciário ─────
    const [[{ velhoNome }]] = await pool.query(
        "SELECT COUNT(*) AS velhoNome FROM tipos_pedido WHERE nome = 'Prisão preventiva'"
    );
    if (Number(velhoNome) > 0) {
        console.log('[DB] Migrando: atualizando nomenclatura dos tipos de pedido...');

        await pool.query("UPDATE tipos_pedido SET nome = 'Pedido de Prisão Preventiva'                    WHERE nome = 'Prisão preventiva'");
        await pool.query("UPDATE tipos_pedido SET nome = 'Pedido de Prisão Temporária'                    WHERE nome = 'Prisão temporária'");
        await pool.query("UPDATE tipos_pedido SET nome = 'Pedido de Busca e Apreensão Criminal'           WHERE nome = 'Busca e apreensão de objetos'");
        await pool.query("UPDATE tipos_pedido SET nome = 'Pedido de Busca e Apreensão de Menor'           WHERE nome = 'Busca e apreensão de menoridade'");

        // Funde "telemático" e "bancário" em um único tipo
        await pool.query("UPDATE tipos_pedido SET nome = 'Pedido de Quebra de Sigilo de Dados e/ou Telefônico' WHERE nome = 'Quebra de sigilo telemático'");
        const [[{ idFundido }]] = await pool.query(
            "SELECT id AS idFundido FROM tipos_pedido WHERE nome = 'Pedido de Quebra de Sigilo de Dados e/ou Telefônico'"
        );
        const [[{ idBanc }]] = await pool.query(
            "SELECT COALESCE((SELECT id FROM tipos_pedido WHERE nome = 'Quebra de sigilo bancário'), 0) AS idBanc"
        );
        if (Number(idBanc) > 0) {
            await pool.query(
                'UPDATE representacao_pedidos SET tipo_pedido_id = ? WHERE tipo_pedido_id = ?',
                [idFundido, idBanc]
            );
            await pool.query('DELETE FROM tipos_pedido WHERE id = ?', [idBanc]);
        }

        console.log('[DB] Migração de tipos de pedido concluída.');
    }

    // ── Usuário admin (apenas se não existir) ────────────────────────────────
    const [[{ adminCount }]] = await pool.query(
        "SELECT COUNT(*) AS adminCount FROM usuarios WHERE login = 'admin'"
    );

    if (Number(adminCount) === 0) {
        const ADMIN_SENHA = process.env.ADMIN_SENHA || 'Admin@123';
        const hash = await bcrypt.hash(ADMIN_SENHA, 10);
        await pool.execute(
            `INSERT INTO usuarios (nome, login, senha_hash, perfil)
             VALUES ('Administrador', 'admin', ?, 'admin')`,
            [hash]
        );
        console.log(`[DB] Usuário admin criado. Senha: ${ADMIN_SENHA}`);
        console.log('[DB] ⚠  Altere a senha no primeiro acesso!');
    }
}
