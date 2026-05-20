import mysql from 'mysql2/promise';
import 'dotenv/config';

// DATABASE_URL tem precedência (DomCloud injeta automaticamente).
// Fallback para variáveis individuais em dev local.
const pool = process.env.DATABASE_URL
    ? mysql.createPool(process.env.DATABASE_URL)
    : mysql.createPool({
        host:               process.env.DB_HOST || 'localhost',
        port:               Number(process.env.DB_PORT) || 3306,
        database:           process.env.DB_NAME,
        user:               process.env.DB_USER,
        password:           process.env.DB_PASS,
        waitForConnections: true,
        connectionLimit:    10,
        charset:            'utf8mb4',
    });

export default pool;
