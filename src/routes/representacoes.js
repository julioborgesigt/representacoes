import { Router } from 'express';
import pool from '../db/pool.js';
import { requireLogin } from '../middleware/auth.js';

const router = Router();

// ── LISTAR com filtros ───────────────────────────────────────────────────────
router.get('/representacoes', requireLogin, async (req, res) => {
    const {
        ano, mes,
        vara_id, crime_id, cidade_id, status_id,
    } = req.query;

    const where  = [];
    const params = [];

    // Filtro temporal padrão (ano e mês)
    if (ano && mes) {
        where.push("DATE_FORMAT(r.data_envio, '%Y-%m') = ?");
        params.push(`${ano}-${String(mes).padStart(2, '0')}`);
    } else if (ano) {
        where.push("YEAR(r.data_envio) = ?");
        params.push(ano);
    }

    if (vara_id)   { where.push('r.vara_id = ?');   params.push(vara_id);   }
    if (crime_id)  { where.push('r.crime_id = ?');  params.push(crime_id);  }
    if (cidade_id) { where.push('r.cidade_id = ?'); params.push(cidade_id); }
    if (status_id) { where.push('r.status_id = ?'); params.push(status_id); }

    const clausula = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const sql = `
        SELECT
            r.id,
            r.numero_processo,
            r.numero_ip,
            v.nome          AS vara,
            r.peticionante,
            c.nome          AS crime,
            cd.nome         AS cidade,
            tp.nome         AS tipo_pedido,
            r.qtd_alvos_pedido,
            r.qtd_alvos_total,
            r.tipo_sigilo,
            r.senha_processo,
            r.data_envio,
            r.data_ultima_verificacao,
            sp.id           AS status_id,
            sp.nome         AS status,
            sp.cor          AS status_cor,
            r.atualizado_em
        FROM representacoes r
        JOIN varas        v  ON v.id  = r.vara_id
        JOIN crimes       c  ON c.id  = r.crime_id
        JOIN cidades      cd ON cd.id = r.cidade_id
        JOIN tipos_pedido tp ON tp.id = r.tipo_pedido_id
        JOIN status_pedido sp ON sp.id = r.status_id
        ${clausula}
        ORDER BY r.data_envio DESC, r.id DESC
    `;

    const [rows] = await pool.query(sql, params);
    res.json(rows);
});

// ── BUSCAR UMA ───────────────────────────────────────────────────────────────
router.get('/representacoes/:id', requireLogin, async (req, res) => {
    const [rows] = await pool.query(
        'SELECT * FROM representacoes WHERE id = ?',
        [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ erro: 'Não encontrado.' });
    res.json(rows[0]);
});

// ── CRIAR ────────────────────────────────────────────────────────────────────
router.post('/representacoes', requireLogin, async (req, res) => {
    const {
        numero_processo, numero_ip,
        vara_id, peticionante,
        crime_id, cidade_id,
        tipo_pedido_id,
        qtd_alvos_pedido, qtd_alvos_total,
        tipo_sigilo, senha_processo,
        data_envio, data_ultima_verificacao,
        status_id,
    } = req.body;

    const [result] = await pool.query(
        `INSERT INTO representacoes
         (numero_processo, numero_ip, vara_id, peticionante, crime_id, cidade_id,
          tipo_pedido_id, qtd_alvos_pedido, qtd_alvos_total, tipo_sigilo, senha_processo,
          data_envio, data_ultima_verificacao, status_id, criado_por)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
            numero_processo, numero_ip,
            vara_id, peticionante,
            crime_id, cidade_id,
            tipo_pedido_id,
            qtd_alvos_pedido || 0, qtd_alvos_total || 0,
            tipo_sigilo, senha_processo || null,
            data_envio, data_ultima_verificacao || null,
            status_id,
            req.session.usuario.id,
        ]
    );

    res.status(201).json({ id: result.insertId });
});

// ── ATUALIZAR ────────────────────────────────────────────────────────────────
router.put('/representacoes/:id', requireLogin, async (req, res) => {
    const {
        numero_processo, numero_ip,
        vara_id, peticionante,
        crime_id, cidade_id,
        tipo_pedido_id,
        qtd_alvos_pedido, qtd_alvos_total,
        tipo_sigilo, senha_processo,
        data_envio, data_ultima_verificacao,
        status_id,
    } = req.body;

    await pool.query(
        `UPDATE representacoes SET
            numero_processo        = ?,
            numero_ip              = ?,
            vara_id                = ?,
            peticionante           = ?,
            crime_id               = ?,
            cidade_id              = ?,
            tipo_pedido_id         = ?,
            qtd_alvos_pedido       = ?,
            qtd_alvos_total        = ?,
            tipo_sigilo            = ?,
            senha_processo         = ?,
            data_envio             = ?,
            data_ultima_verificacao= ?,
            status_id              = ?
         WHERE id = ?`,
        [
            numero_processo, numero_ip,
            vara_id, peticionante,
            crime_id, cidade_id,
            tipo_pedido_id,
            qtd_alvos_pedido || 0, qtd_alvos_total || 0,
            tipo_sigilo, senha_processo || null,
            data_envio, data_ultima_verificacao || null,
            status_id,
            req.params.id,
        ]
    );

    res.json({ ok: true });
});

// ── EXCLUIR ──────────────────────────────────────────────────────────────────
router.delete('/representacoes/:id', requireLogin, async (req, res) => {
    await pool.query('DELETE FROM representacoes WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
});

export default router;
