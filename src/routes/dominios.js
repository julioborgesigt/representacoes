import { Router } from 'express';
import pool from '../db/pool.js';
import { requireLogin } from '../middleware/auth.js';

const router = Router();

// Retorna todos os domínios de uma vez para popular selects do frontend
router.get('/dominios', requireLogin, async (_req, res) => {
    const [varas]       = await pool.query('SELECT id, nome FROM varas ORDER BY id');
    const [crimes]      = await pool.query('SELECT id, nome FROM crimes ORDER BY nome');
    const [cidades]     = await pool.query('SELECT id, nome FROM cidades ORDER BY nome');
    const [tiposPedido] = await pool.query('SELECT id, nome FROM tipos_pedido ORDER BY id');
    const [statusList]  = await pool.query('SELECT id, nome, cor FROM status_pedido ORDER BY ordem');

    res.json({ varas, crimes, cidades, tiposPedido, statusList });
});

export default router;
