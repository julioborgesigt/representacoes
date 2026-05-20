import { Router } from 'express';
import pool from '../db/pool.js';
import { requireLogin } from '../middleware/auth.js';

const router = Router();

// ── LISTAR com filtros ───────────────────────────────────────────────────────
router.get('/representacoes', requireLogin, async (req, res) => {
    const { ano, mes, vara_id, crime_id, cidade_id, status_id } = req.query;

    const where  = [];
    const params = [];

    if (ano && mes) {
        where.push("DATE_FORMAT(r.data_envio, '%Y-%m') = ?");
        params.push(`${ano}-${String(mes).padStart(2, '0')}`);
    } else if (ano) {
        where.push('YEAR(r.data_envio) = ?');
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
            v.nome           AS vara,
            r.peticionante,
            c.nome           AS crime,
            cd.nome          AS cidade,
            GROUP_CONCAT(tp.nome     ORDER BY rp.id SEPARATOR '||') AS pedidos_nomes,
            GROUP_CONCAT(rp.qtd_alvos ORDER BY rp.id SEPARATOR ',') AS pedidos_alvos,
            r.qtd_alvos_total,
            r.tipo_sigilo,
            r.senha_processo,
            r.observacoes,
            r.data_envio,
            r.data_ultima_verificacao,
            sp.id            AS status_id,
            sp.nome          AS status,
            sp.cor           AS status_cor,
            r.atualizado_em
        FROM representacoes r
        JOIN varas         v  ON v.id  = r.vara_id
        JOIN crimes        c  ON c.id  = r.crime_id
        JOIN cidades       cd ON cd.id = r.cidade_id
        LEFT JOIN representacao_pedidos rp ON rp.representacao_id = r.id
        LEFT JOIN tipos_pedido          tp ON tp.id = rp.tipo_pedido_id
        JOIN status_pedido sp ON sp.id = r.status_id
        ${clausula}
        GROUP BY r.id
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

    const [pedidos] = await pool.query(
        'SELECT tipo_pedido_id, qtd_alvos FROM representacao_pedidos WHERE representacao_id = ? ORDER BY id',
        [req.params.id]
    );

    res.json({ ...rows[0], pedidos });
});

// ── CRIAR ────────────────────────────────────────────────────────────────────
router.post('/representacoes', requireLogin, async (req, res) => {
    const {
        numero_processo, numero_ip,
        vara_id, peticionante,
        crime_id, cidade_id,
        pedidos,
        qtd_alvos_total,
        tipo_sigilo, senha_processo,
        observacoes,
        data_envio, data_ultima_verificacao,
        status_id,
    } = req.body;

    if (!Array.isArray(pedidos) || pedidos.length === 0) {
        return res.status(400).json({ erro: 'Informe pelo menos um tipo de pedido.' });
    }

    const conn = await pool.getConnection();
    await conn.beginTransaction();
    try {
        const [result] = await conn.query(
            `INSERT INTO representacoes
             (numero_processo, numero_ip, vara_id, peticionante, crime_id, cidade_id,
              qtd_alvos_total, tipo_sigilo, senha_processo, observacoes,
              data_envio, data_ultima_verificacao, status_id, criado_por)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [
                numero_processo, numero_ip,
                vara_id, peticionante,
                crime_id, cidade_id,
                qtd_alvos_total || 0,
                tipo_sigilo, senha_processo || null,
                observacoes || null,
                data_envio, data_ultima_verificacao || null,
                status_id,
                req.session.usuario.id,
            ]
        );

        const repId = result.insertId;
        for (const p of pedidos) {
            await conn.query(
                'INSERT INTO representacao_pedidos (representacao_id, tipo_pedido_id, qtd_alvos) VALUES (?,?,?)',
                [repId, p.tipo_pedido_id, p.qtd_alvos || 0]
            );
        }

        await conn.commit();
        res.status(201).json({ id: repId });
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
});

// ── ATUALIZAR ────────────────────────────────────────────────────────────────
router.put('/representacoes/:id', requireLogin, async (req, res) => {
    const {
        numero_processo, numero_ip,
        vara_id, peticionante,
        crime_id, cidade_id,
        pedidos,
        qtd_alvos_total,
        tipo_sigilo, senha_processo,
        observacoes,
        data_envio, data_ultima_verificacao,
        status_id,
    } = req.body;

    if (!Array.isArray(pedidos) || pedidos.length === 0) {
        return res.status(400).json({ erro: 'Informe pelo menos um tipo de pedido.' });
    }

    const conn = await pool.getConnection();
    await conn.beginTransaction();
    try {
        await conn.query(
            `UPDATE representacoes SET
                numero_processo         = ?,
                numero_ip               = ?,
                vara_id                 = ?,
                peticionante            = ?,
                crime_id                = ?,
                cidade_id               = ?,
                qtd_alvos_total         = ?,
                tipo_sigilo             = ?,
                senha_processo          = ?,
                observacoes             = ?,
                data_envio              = ?,
                data_ultima_verificacao = ?,
                status_id               = ?
             WHERE id = ?`,
            [
                numero_processo, numero_ip,
                vara_id, peticionante,
                crime_id, cidade_id,
                qtd_alvos_total || 0,
                tipo_sigilo, senha_processo || null,
                observacoes || null,
                data_envio, data_ultima_verificacao || null,
                status_id,
                req.params.id,
            ]
        );

        await conn.query('DELETE FROM representacao_pedidos WHERE representacao_id = ?', [req.params.id]);
        for (const p of pedidos) {
            await conn.query(
                'INSERT INTO representacao_pedidos (representacao_id, tipo_pedido_id, qtd_alvos) VALUES (?,?,?)',
                [req.params.id, p.tipo_pedido_id, p.qtd_alvos || 0]
            );
        }

        await conn.commit();
        res.json({ ok: true });
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
});

// ── IMPORTAR CSV ─────────────────────────────────────────────────────────────
router.post('/representacoes/importar', requireLogin, async (req, res) => {
    const { linhas } = req.body;
    if (!Array.isArray(linhas) || linhas.length === 0)
        return res.status(400).json({ erro: 'Nenhuma linha recebida.' });

    let conn;
    try {
        const [tiposPedido] = await pool.query('SELECT id, nome FROM tipos_pedido');
        const [crimesDB]    = await pool.query('SELECT id, nome FROM crimes');
        const [statusList]  = await pool.query('SELECT id, nome FROM status_pedido ORDER BY ordem');
        const [varas]       = await pool.query('SELECT id FROM varas   ORDER BY id LIMIT 1');
        const [cidades]     = await pool.query('SELECT id FROM cidades ORDER BY id LIMIT 1');

        if (!varas.length || !cidades.length || !statusList.length)
            return res.status(500).json({ erro: 'Dados de configuração incompletos (varas, cidades ou status não cadastrados).' });

        const defaultVaraId   = varas[0].id;
        const defaultCidadeId = cidades[0].id;
        const defaultStatusId = statusList[0].id;

        // Cache mutable: cresce durante o batch sem re-consultar o banco
        const crimeCache = new Map(crimesDB.map(c => [c.nome.toLowerCase().trim(), c.id]));

        function matchExato(lista, nome) {
            if (!nome) return null;
            const q = nome.toLowerCase().trim();
            return lista.find(i => i.nome.toLowerCase() === q) ?? null;
        }
        function matchNomeFuzzy(lista, nome) {
            if (!nome) return null;
            const q = nome.toLowerCase().trim();
            return lista.find(i => i.nome.toLowerCase() === q)?.id
                ?? lista.find(i => { const n = i.nome.toLowerCase(); return q.includes(n) || n.includes(q); })?.id
                ?? null;
        }

        const resultado = { criados: 0, atualizados: 0, sem_alteracao: 0, ignorados: 0, crimes_novos: 0 };

        conn = await pool.getConnection();
        await conn.beginTransaction();

        for (const l of linhas) {
            const { numero_processo, data_envio, assunto_principal, situacao, classe } = l;
            if (!numero_processo) continue;

            const tipoPedido = matchExato(tiposPedido, classe);
            if (!tipoPedido) { resultado.ignorados++; continue; }

            // ── Crime: busca no cache; se não existir, cria ──────────────────
            const nomecrimeKey = (assunto_principal ?? '').toLowerCase().trim();
            let crimeId = crimeCache.get(nomecrimeKey);
            if (!crimeId) {
                const nomeCrime = (assunto_principal ?? '').trim() || 'Não informado';
                // INSERT IGNORE evita erro de UNIQUE; depois buscamos o ID real
                await conn.query('INSERT IGNORE INTO crimes (nome) VALUES (?)', [nomeCrime]);
                const [[crimeRow]] = await conn.query(
                    'SELECT id FROM crimes WHERE LOWER(nome) = LOWER(?)', [nomeCrime]
                );
                if (!crimeRow) throw new Error(`Falha ao criar crime: ${nomeCrime}`);
                crimeId = crimeRow.id;
                crimeCache.set(nomecrimeKey, crimeId);
                resultado.crimes_novos++;
            }

            // ── Verifica se registro já existe ──────────────────────────────
            const [[exist]] = await conn.query(
                'SELECT id, data_envio, crime_id FROM representacoes WHERE numero_processo = ?',
                [numero_processo]
            );

            if (exist) {
                const dataDB = exist.data_envio instanceof Date
                    ? exist.data_envio.toISOString().slice(0, 10)
                    : String(exist.data_envio ?? '').slice(0, 10);
                const mudou = (data_envio && dataDB !== data_envio) || exist.crime_id !== crimeId;

                if (mudou) {
                    await conn.query(
                        'UPDATE representacoes SET data_envio = ?, crime_id = ? WHERE id = ?',
                        [data_envio || dataDB, crimeId, exist.id]
                    );
                    resultado.atualizados++;
                } else {
                    resultado.sem_alteracao++;
                }
            } else {
                const statusId = matchNomeFuzzy(statusList, situacao) ?? defaultStatusId;
                const [ins] = await conn.query(
                    `INSERT INTO representacoes
                     (numero_processo, numero_ip, vara_id, peticionante, crime_id, cidade_id,
                      qtd_alvos_total, tipo_sigilo, senha_processo,
                      data_envio, data_ultima_verificacao, status_id, criado_por)
                     VALUES (?, '', ?, '', ?, ?, 0, 'segredo_justica', NULL, ?, NULL, ?, ?)`,
                    [
                        numero_processo, defaultVaraId, crimeId, defaultCidadeId,
                        data_envio || new Date().toISOString().slice(0, 10),
                        statusId, req.session.usuario.id,
                    ]
                );
                await conn.query(
                    'INSERT INTO representacao_pedidos (representacao_id, tipo_pedido_id, qtd_alvos) VALUES (?, ?, 0)',
                    [ins.insertId, tipoPedido.id]
                );
                resultado.criados++;
            }
        }

        await conn.commit();
        res.json(resultado);

    } catch (err) {
        if (conn) await conn.rollback().catch(() => {});
        console.error('[importar]', err);
        res.status(500).json({ erro: err.message || 'Erro interno ao importar.' });
    } finally {
        if (conn) conn.release();
    }
});

// ── EXCLUIR ──────────────────────────────────────────────────────────────────
router.delete('/representacoes/:id', requireLogin, async (req, res) => {
    await pool.query('DELETE FROM representacoes WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
});

export default router;
