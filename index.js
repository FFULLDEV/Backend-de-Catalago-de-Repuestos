const express = require("express");
const cors = require("cors");
const path = require("path");

const port = 3000;
const repuestosRoutes = require("./routes/repuestos");
const authRoutes = require("./routes/auth");

const app = express();

// Middlewares
app.use(cors());
app.use(express.json()); // Para parsear JSON

// Archivos estáticos (ej: imágenes)
app.use("/img", express.static(path.join(__dirname, "public/img")));

// Rutas
app.use("/repuestos", repuestosRoutes);
app.use("/auth", authRoutes);

// Servidor
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
