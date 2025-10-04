const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { verificarToken, soloAdmin } = require('../middleware/authMiddleware');

const SECRET = 'claveultrasecreta'; // ponla en .env

// Registro de usuario normal
router.post('/register', async (req, res) => {
    const { usuario, contrasena } = req.body;

    if (!usuario || !contrasena) {
        return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
    }

    try {
        const existe = await pool.query('SELECT * FROM usuarios WHERE usuario = $1', [usuario]);
        if (existe.rows.length > 0) {
            return res.status(400).json({ error: 'Usuario ya existe' });
        }

        const hash = await bcrypt.hash(contrasena, 10);
        await pool.query(
            'INSERT INTO usuarios (usuario, contrasena, rol_id) VALUES ($1, $2, $3)',
            [usuario, hash, 2]  // siempre rol "user"
        );

        res.json({ mensaje: 'Usuario registrado correctamente' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// Registro de administrador (protegido, solo otro admin puede crear admins)
router.post('/register-admin', verificarToken, soloAdmin, async (req, res) => {
    const { usuario, contrasena } = req.body;

    if (!usuario || !contrasena) {
        return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
    }

    try {
        const existe = await pool.query('SELECT * FROM usuarios WHERE usuario = $1', [usuario]);
        if (existe.rows.length > 0) {
            return res.status(400).json({ error: 'Usuario ya existe' });
        }

        const hash = await bcrypt.hash(contrasena, 10);
        await pool.query(
            'INSERT INTO usuarios (usuario, contrasena, rol_id) VALUES ($1, $2, $3)',
            [usuario, hash, 1]  // aquí siempre rol "admin"
        );

        res.json({ mensaje: 'Administrador registrado correctamente' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// Login igual que ya lo tienes
router.post('/login', async (req, res) => {
    const { usuario, contrasena } = req.body;
    if (!usuario || !contrasena) {
        return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
    }
    try {
        const result = await pool.query('SELECT * FROM usuarios WHERE usuario = $1', [usuario]);
        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Usuario no encontrado' });
        }
        const user = result.rows[0];
        const match = await bcrypt.compare(contrasena, user.contrasena);
        if (!match) {
            return res.status(400).json({ error: 'Contraseña incorrecta' });
        }

        const token = jwt.sign(
            { id: user.id, usuario: user.usuario, rol: user.rol },
            SECRET,
            { expiresIn: '2h' }
        );

        res.json({ mensaje: 'Login exitoso', token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

module.exports = router;

