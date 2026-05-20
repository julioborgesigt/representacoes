import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import pool from './pool.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlPath   = join(__dirname, '..', '..', 'schema.sql');

export async function initDB() {
    // Verifica se as tabelas já existem para evitar reexecução desnecessária
    const [[{ count }]] = await pool.query(
        `SELECT COUNT(*) AS count
         FROM information_schema.tables
         WHERE table_schema = DATABASE() AND table_name = 'representacoes'`
    );

    if (Number(count) === 0) {
        console.log('[DB] Primeira execução — criando tabelas e dados iniciais...');
        const sql = readFileSync(sqlPath, 'utf8');
        const conn = await pool.getConnection();
        // multipleStatements não está ativo no pool; executa bloco a bloco
        const statements = sql
            .split(/;\s*\n/)
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));
        for (const stmt of statements) {
            await conn.query(stmt).catch(() => {}); // ignora IF NOT EXISTS duplicados
        }
        conn.release();
        console.log('[DB] Tabelas criadas.');
    }

    // Cria usuário admin apenas se não existir
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
        console.log('[DB] ⚠ Altere a senha no primeiro acesso!');
    }
}
