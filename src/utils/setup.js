/**
 * Script de setup inicial — executa schema.sql e cria o usuário admin.
 * Uso: node src/utils/setup.js
 *
 * Suporta .env (local) e variáveis de ambiente injetadas pelo DomCloud.
 * DATABASE_URL tem precedência sobre as variáveis individuais.
 */
import 'dotenv/config';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlPath   = join(__dirname, '..', '..', 'schema.sql');

// ── Conexão ──────────────────────────────────────────────────────────────────
// DomCloud injeta DATABASE_URL; fallback para vars individuais em dev local.
let conn;
if (process.env.DATABASE_URL) {
    conn = await mysql.createConnection(process.env.DATABASE_URL + '?multipleStatements=true');
} else {
    conn = await mysql.createConnection({
        host:               process.env.DB_HOST || 'localhost',
        port:               Number(process.env.DB_PORT) || 3306,
        database:           process.env.DB_NAME,
        user:               process.env.DB_USER,
        password:           process.env.DB_PASS,
        multipleStatements: true,
    });
}

// ── DDL + seed ────────────────────────────────────────────────────────────────
const sql = readFileSync(sqlPath, 'utf8');
await conn.query(sql);
console.log('✔ Tabelas e dados de referência criados.');

// ── Usuário admin (apenas se ainda não existir) ───────────────────────────────
const [[{ count }]] = await conn.query(
    "SELECT COUNT(*) AS count FROM usuarios WHERE login = 'admin'"
);

if (Number(count) === 0) {
    const ADMIN_SENHA = process.env.ADMIN_SENHA || 'Admin@123';
    const hash        = await bcrypt.hash(ADMIN_SENHA, 10);

    await conn.execute(
        `INSERT INTO usuarios (nome, login, senha_hash, perfil)
         VALUES ('Administrador', 'admin', ?, 'admin')`,
        [hash]
    );

    console.log('✔ Usuário administrador criado.');
    console.log(`  Login: admin`);
    console.log(`  Senha: ${ADMIN_SENHA}`);
    console.log('  ⚠ ALTERE A SENHA NO PRIMEIRO ACESSO!');
} else {
    console.log('ℹ Usuário admin já existe — senha mantida.');
}

await conn.end();
console.log('✔ Setup concluído.');
