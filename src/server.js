import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import authRouter           from './routes/auth.js';
import dominiosRouter       from './routes/dominios.js';
import representacoesRouter from './routes/representacoes.js';
import { requireLogin }     from './middleware/auth.js';
import { initDB }           from './db/init.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middlewares globais ──────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
    secret:            process.env.SESSION_SECRET || 'dev-secret',
    resave:            false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        maxAge:   8 * 60 * 60 * 1000, // 8 horas
    },
}));

// ── Arquivos estáticos ───────────────────────────────────────────────────────
app.use('/static', express.static(join(__dirname, '..', 'public')));

// ── Rotas de autenticação ────────────────────────────────────────────────────
app.use(authRouter);

// ── API ──────────────────────────────────────────────────────────────────────
app.use('/api', dominiosRouter);
app.use('/api', representacoesRouter);

// ── Páginas HTML ─────────────────────────────────────────────────────────────
const views = join(__dirname, '..', 'views');

app.get('/', requireLogin, (_req, res) => res.sendFile('index.html',  { root: views }));

// ── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ erro: 'Rota não encontrada.' }));

// ── Erro global ──────────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno do servidor.' });
});

// Inicializa banco e sobe o servidor
initDB()
    .then(() => app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`)))
    .catch(err => { console.error('[DB] Falha na inicialização:', err); process.exit(1); });
