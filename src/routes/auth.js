import { Router } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db/pool.js';

const router = Router();

router.get('/login', (req, res) => {
    if (req.session?.usuario) return res.redirect('/');
    res.sendFile('login.html', { root: 'views' });
});

router.post('/login', async (req, res) => {
    const { login, senha } = req.body;
    if (!login || !senha) {
        return res.status(400).json({ erro: 'Informe login e senha.' });
    }

    const [rows] = await pool.query(
        'SELECT id, nome, login, senha_hash, perfil FROM usuarios WHERE login = ? AND ativo = 1',
        [login]
    );

    if (!rows.length) {
        return res.status(401).json({ erro: 'Usuário ou senha inválidos.' });
    }

    const usuario = rows[0];
    const senhaOk = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaOk) {
        return res.status(401).json({ erro: 'Usuário ou senha inválidos.' });
    }

    req.session.usuario = {
        id:     usuario.id,
        nome:   usuario.nome,
        login:  usuario.login,
        perfil: usuario.perfil,
    };

    res.json({ ok: true });
});

router.post('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/login'));
});

export default router;
