 // routes/users.js

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { verifyToken, verifyRole } = require('../middleware/auth');

// Ruta para obtener todos los usuarios (Solo para Administradores)
router.get('/', verifyToken, verifyRole('admin'), async (req, res) => {
  // ... código existente ...
});

// Ruta para crear un nuevo usuario (Solo para Administradores)
router.post('/', verifyToken, verifyRole('admin'), async (req, res) => {
  // ... código existente ...
});

// Ruta para resetear la contraseña de un usuario (Solo para Administradores)
router.put('/reset-password/:id', verifyToken, verifyRole('admin'), async (req, res) => {
  try {
    const userId = req.params.id;
    const { newPassword } = req.body;

    // Verificar que se proporcionó una nueva contraseña
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'La nueva contraseña es obligatoria y debe tener al menos 6 caracteres' });
    }

    // Buscar al usuario por ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Actualizar la contraseña
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Contraseña actualizada exitosamente' });
  } catch (error) {
    console.error('Error al resetear la contraseña:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

module.exports = router;
