const express = require('express');
const router = express.Router();
const pool = require('../db');
const multer = require('multer');
const path = require('path');
const { verificarToken, soloAdmin } = require('../middleware/authMiddleware');

// Configuración de multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../public/img'));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

/**
 * Rutas públicas
 */

// Obtener todos los repuestos
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM repuestos WHERE activo IS DISTINCT FROM false');
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
});

// Obtener un repuesto por id
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM repuestos WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).send('Repuesto no encontrado');
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
});

/**
 * Rutas solo para administradores
 */

// Crear repuesto
router.post('/', verificarToken, soloAdmin, upload.single('imagen'), async (req, res) => {
  const { nombre, marca, descripcion, precio } = req.body;
  const imagenUrl = `/img/${req.file.filename}`;
  try {
    const result = await pool.query(
      'INSERT INTO repuestos (nombre, marca, descripcion, precio, imagen, activo) VALUES ($1,$2,$3,$4,$5,true) RETURNING *',
      [nombre, marca, descripcion, precio, imagenUrl]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err.message });
  }
});

// Actualizar repuesto
router.put('/:id', verificarToken, soloAdmin, upload.single('imagen'), async (req, res) => {
  const { id } = req.params;
  const { nombre, marca, descripcion, precio } = req.body;

  try {
    // Si se sube nueva imagen
    let imagenUrl = null;
    if (req.file) {
      imagenUrl = `/img/${req.file.filename}`;
    }

    const result = await pool.query(
      `UPDATE repuestos 
       SET nombre = COALESCE($1, nombre),
           marca = COALESCE($2, marca),
           descripcion = COALESCE($3, descripcion),
           precio = COALESCE($4, precio),
           imagen = COALESCE($5, imagen)
       WHERE id = $6 RETURNING *`,
      [nombre || null, marca || null, descripcion || null, precio || null, imagenUrl, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).send('Repuesto no encontrado');
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
});

// Deshabilitar repuesto
router.patch('/:id/deshabilitar', verificarToken, soloAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'UPDATE repuestos SET activo = false WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).send('Repuesto no encontrado');
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
});

module.exports = router;


