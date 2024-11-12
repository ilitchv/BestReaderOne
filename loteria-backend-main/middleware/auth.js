// middleware/auth.js

const jwt = require('jsonwebtoken');

// Clave secreta para JWT (debe estar en variables de entorno en producción)
const JWT_SECRET = process.env.JWT_SECRET || 'tu_clave_secreta';

// Middleware para verificar el token JWT
function verifyToken(req, res, next) {
  // Obtener el token del encabezado Authorization
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Formato: "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ msg: 'No se proporcionó un token, autorización denegada' });
  }

  try {
    // Verificar y decodificar el token
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded.user; // Guardar la información del usuario en la solicitud
    next();
  } catch (error) {
    res.status(401).json({ msg: 'Token inválido, autorización denegada' });
  }
}

// Middleware para verificar el rol del usuario
function verifyRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ msg: 'Acceso prohibido: No tienes los permisos necesarios' });
    }
    next();
  };
}

module.exports = { verifyToken, verifyRole };
