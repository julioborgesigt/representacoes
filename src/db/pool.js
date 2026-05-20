import mysql from 'mysql2/promise';
import 'dotenv/config';

const pool = mysql.createPool({
    host:               process.env.DB_HOST     || 'localhost',
    port:               Number(process.env.DB_PORT) || 3306,
    database:           process.env.DB_NAME,
    user:               process.env.DB_USER,
    password:           process.env.DB_PASS,
    waitForConnections: true,
    connectionLimit:    10,
    charset:            'utf8mb4',
});

export default pool;
