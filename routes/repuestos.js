const express = require("express");
const router = express.Router();
const pool = require("../db");
const multer = require("multer");
const path = require("path");
const { verificarToken, soloAdmin } = require("../middleware/authMiddleware");

// Configuración de multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../public/img"));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

/**
 * Rutas públicas
 */

// Obtener todos los repuestos
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM repuestos WHERE activo IS DISTINCT FROM false"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Error del servidor");
  }
});

/**
 * Rutas solo para administradores
 */

// Crear repuesto
router.post(
  "/",
  verificarToken,
  soloAdmin,
  upload.single("imagen"), // <- Multer procesa la imagen aquí
  async (req, res) => {
    try {
      const { nombre, marca, descripcion, precio } = req.body;

      // Aquí defines la URL pública del archivo subido
      const imagenUrl = req.file ? `/img/${req.file.filename}` : null;

      const result = await pool.query(
        "INSERT INTO repuestos (nombre, marca, descripcion, precio, imagen, activo) VALUES ($1, $2, $3, $4, $5, true) RETURNING *",
        [nombre, marca, descripcion, precio, imagenUrl]
      );

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error al crear repuesto:", err);
      res.status(500).json({ error: "Error en el servidor" });
    }
  }
);

// Actualizar repuesto
router.put(
  "/:id",
  verificarToken,
  soloAdmin,
  upload.single("imagen"),
  async (req, res) => {
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
        [
          nombre || null,
          marca || null,
          descripcion || null,
          precio || null,
          imagenUrl,
          id,
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).send("Repuesto no encontrado");
      }
      res.json(result.rows[0]);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Error del servidor");
    }
  }
);

// Obtener repuestos deshabilitados (solo admin)
router.get("/deshabilitados", verificarToken, soloAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM repuestos WHERE activo = false ORDER BY id ASC"
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener repuestos deshabilitados:", error);
    res
      .status(500)
      .json({ error: "Error al obtener repuestos deshabilitados" });
  }
});

// Obtener un repuesto por ID (solo admin)
router.get("/:id", verificarToken, soloAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("SELECT * FROM repuestos WHERE id = $1", [
      id,
    ]);
    if (result.rows.length === 0) {
      return res.status(404).send("Repuesto no encontrado");
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Error del servidor");
  }
});

// Alternar estado (activar/desactivar)
router.patch("/:id/toggle", verificarToken, soloAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    // Cambia el valor de activo al opuesto (true -> false o false -> true)
    const result = await pool.query(
      "UPDATE repuestos SET activo = NOT activo WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).send("Repuesto no encontrado");
    }

    const repuesto = result.rows[0];
    const mensaje = repuesto.activo
      ? "Repuesto activado correctamente"
      : "Repuesto desactivado correctamente";

    res.json({ mensaje, repuesto });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Error del servidor");
  }
});

module.exports = router;
