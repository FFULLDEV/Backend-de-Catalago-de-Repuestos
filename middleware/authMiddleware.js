const jwt = require("jsonwebtoken");
const SECRET = "claveultrasecreta";

function verificarToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token requerido" });

  jwt.verify(token, SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Token inválido" });
    req.user = user;
    next();
  });
}

function soloAdmin(req, res, next) {
  // Verificamos si rol_id es 1 (admin)
  if (req.user.rol_id !== 1) {
    return res.status(403).json({ error: "No autorizado" });
  }
  next();
}

module.exports = { verificarToken, soloAdmin };
