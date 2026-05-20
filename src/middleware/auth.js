export function requireLogin(req, res, next) {
    if (req.session?.usuario) return next();
    res.redirect('/login');
}

export function requireAdmin(req, res, next) {
    if (req.session?.usuario?.perfil === 'admin') return next();
    res.status(403).json({ erro: 'Acesso restrito a administradores.' });
}
