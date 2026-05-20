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
