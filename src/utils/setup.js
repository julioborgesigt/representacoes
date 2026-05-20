/**
 * Script de setup inicial — executa schema.sql no banco configurado em .env
 * Uso: node src/utils/setup.js
 */
import 'dotenv/config';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlPath   = join(__dirname, '..', '..', 'schema.sql');

const conn = await mysql.createConnection({
    host:     process.env.DB_HOST || 'localhost',
    port:     Number(process.env.DB_PORT) || 3306,
    database: process.env.DB_NAME,
    user:     process.env.DB_USER,
    password: process.env.DB_PASS,
    multipleStatements: true,
});

const sql = readFileSync(sqlPath, 'utf8');
await conn.query(sql);
await conn.end();

console.log('✔ Banco de dados inicializado com sucesso.');
console.log('  Login padrão: admin / Admin@123');
console.log('  ALTERE A SENHA NO PRIMEIRO ACESSO!');
