 // routes/auth.js

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const InvitationCode = require('../models/InvitationCode'); // Importar el modelo InvitationCode
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Clave secreta para JWT (debe estar en variables de entorno en producción)
const JWT_SECRET = process.env.JWT_SECRET || 'tu_clave_secreta';

// Configuración de nodemailer para enviar correos electrónicos
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_USER, // Tu correo electrónico de Gmail
    pass: process.env.EMAIL_PASSWORD // Tu contraseña de aplicación de Gmail
  }
});

// Middleware para verificar el token JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1]; // Formato: Bearer TOKEN

  if (!token) {
    return res.status(401).json({ msg: 'No se proporcionó token de autenticación.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch (error) {
    console.error('Error en authenticateToken:', error.message);
    res.status(401).json({ msg: 'Token de autenticación inválido.' });
  }
};

// =========================
// Ruta de Registro de Usuario
// =========================
router.post('/register', [
  check('username', 'El nombre de usuario es obligatorio').notEmpty(),
  check('password', 'La contraseña debe tener al menos 6 caracteres').isLength({ min: 6 }),
  check('email', 'Debe ser un correo electrónico válido').isEmail(),
  // No requerimos referralCode aquí
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Devolver todos los errores de validación
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, email, password, referralCode, invitationCode } = req.body;

  try {
    // Verificar si el usuario ya existe
    let user = await User.findOne({ $or: [{ username }, { email }] });
    if (user) {
      return res.status(400).json({ msg: 'El usuario o correo electrónico ya existe' });
    }

    if (invitationCode) {
      // Manejar registro con código de invitación
      const invitation = await InvitationCode.findOne({ code: invitationCode, used: false });

      if (!invitation) {
        return res.status(400).json({ msg: 'Código de invitación inválido o ya utilizado.' });
      }

      // Asignar el usuario que creó la invitación como referrer
      const referrer = await User.findById(invitation.createdBy);

      // Crear el nuevo usuario
      user = new User({
        username,
        password,
        email,
        referredBy: referrer.referralCode
      });

      await user.save();

      // Marcar el código de invitación como utilizado
      invitation.used = true;
      invitation.usedBy = user.id;
      invitation.dateUsed = Date.now();
      await invitation.save();

      // Agregar el nuevo usuario al array de referrals del referrer
      referrer.referrals.push(user.id);
      await referrer.save();

    } else if (referralCode) {
      // Manejar registro con código de referido
      // Verificar si el código de referido es válido
      const referrer = await User.findOne({ referralCode });
      if (!referrer) {
        return res.status(400).json({ msg: 'Código de referido inválido. Por favor, contacta al administrador.' });
      }

      // Crear un nuevo usuario
      user = new User({
        username,
        password,
        email,
        referredBy: referrer.referralCode
      });

      await user.save();

      // Agregar el nuevo usuario al array de referrals del referrer
      referrer.referrals.push(user.id);
      await referrer.save();

    } else {
      // Si no se proporciona ni invitationCode ni referralCode
      return res.status(400).json({ msg: 'Se requiere un código de referido o de invitación para registrarse.' });
    }

    // Crear el token JWT
    const payload = {
      user: {
        id: user.id,
        role: user.role
      }
    };

    jwt.sign(
      payload,
      JWT_SECRET,
      { expiresIn: '1h' }, // El token expirará en 1 hora
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );

  } catch (error) {
    console.error('Error en /register:', error.message);
    res.status(500).json({ msg: 'Error en el servidor' });
  }
});

// =========================
// Ruta de Inicio de Sesión
// =========================
router.post('/login', [
  check('username', 'El nombre de usuario es obligatorio').notEmpty(),
  check('password', 'La contraseña es obligatoria').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Devolver todos los errores de validación
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, password } = req.body;

  try {
    // Buscar al usuario por nombre de usuario
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ msg: 'Credenciales inválidas' });
    }

    // Comparar la contraseña
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Credenciales inválidas' });
    }

    // Crear el token JWT
    const payload = {
      user: {
        id: user.id,
        role: user.role
      }
    };

    jwt.sign(
      payload,
      JWT_SECRET,
      { expiresIn: '1h' }, // El token expirará en 1 hora
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );

  } catch (error) {
    console.error('Error en /login:', error.message);
    res.status(500).json({ msg: 'Error en el servidor' });
  }
});

// =========================
// Ruta para Obtener el Perfil del Usuario
// =========================
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -resetPasswordToken -resetPasswordExpires -verificationToken -verificationExpires');

    if (!user) {
      return res.status(404).json({ msg: 'Usuario no encontrado.' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error en /profile:', error.message);
    res.status(500).json({ msg: 'Error en el servidor' });
  }
});

// =========================
// Ruta para Actualizar el Perfil del Usuario
// =========================
router.put('/update-profile', [
  authenticateToken,
  // Validaciones opcionales
  check('firstName').optional().isString().withMessage('El nombre debe ser una cadena de texto.'),
  check('lastName').optional().isString().withMessage('El apellido debe ser una cadena de texto.'),
  check('phoneNumber').optional().matches(/^\+?[1-9]\d{1,14}$/, 'i').withMessage('Número de teléfono inválido.')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Devolver todos los errores de validación
    return res.status(400).json({ errors: errors.array() });
  }

  const { firstName, lastName, phoneNumber } = req.body;

  try {
    // Encontrar al usuario por ID
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ msg: 'Usuario no encontrado.' });
    }

    // Actualizar los campos si se proporcionan
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;

    await user.save();

    res.status(200).json({ msg: 'Perfil actualizado exitosamente.', user });
  } catch (error) {
    console.error('Error en /update-profile:', error.message);
    res.status(500).json({ msg: 'Error en el servidor' });
  }
});

// =========================
// Ruta para Generar Código de Invitación de Un Solo Uso
// =========================
router.post('/generate-invitation', authenticateToken, async (req, res) => {
  try {
    // Verificar si el usuario cumple con las condiciones necesarias
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'Usuario no encontrado.' });
    }

    // Aquí puedes verificar las condiciones que el usuario debe cumplir
    // Por ejemplo, si su cuenta está verificada
    // if (!user.isVerified) {
    //   return res.status(403).json({ msg: 'Debes verificar tu cuenta antes de generar invitaciones.' });
    // }

    // Generar un código de invitación único
    const code = crypto.randomBytes(8).toString('hex');

    // Crear un nuevo documento de InvitationCode
    const invitation = new InvitationCode({
      code,
      createdBy: user.id,
      used: false
    });

    await invitation.save();

    // Generar el enlace de invitación
    const invitationLink = `https://ilitchv.github.io/BestReaderOne/signup.html?invitationCode=${code}`;

    res.json({ invitationLink });
  } catch (error) {
    console.error('Error en /generate-invitation:', error.message);
    res.status(500).json({ msg: 'Error en el servidor' });
  }
});

// =========================
// Resto de las rutas existentes
// =========================

// Ruta para Enviar Invitaciones por Correo Electrónico
router.post('/invite', [
  authenticateToken,
  check('email', 'Debe ser un correo electrónico válido').isEmail()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Devolver todos los errores de validación
    return res.status(400).json({ errors: errors.array() });
  }

  const { email } = req.body;

  try {
    // Verificar si el correo electrónico ya está registrado
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ msg: 'El correo electrónico ya está registrado.' });
    }

    // Obtener el usuario que está enviando la invitación
    const inviter = await User.findById(req.user.id);
    if (!inviter) {
      return res.status(404).json({ msg: 'Usuario no encontrado.' });
    }

    // Generar el enlace de referido
    const referralLink = `https://ilitchv.github.io/BestReaderOne/signup.html?referralCode=${inviter.referralCode}`;

    // Enviar el correo electrónico
    const mailOptions = {
      to: email,
      from: process.env.EMAIL_USER,
      subject: 'Invitación para Unirte a Beast Reader',
      text: `Hola,

Has sido invitado a unirte a Beast Reader por ${inviter.username}.

Haz clic en el siguiente enlace para registrarte con su código de referido:

${referralLink}

¡Esperamos verte pronto!

Saludos,
Equipo de Beast Reader`
    };

    transporter.sendMail(mailOptions, (err) => {
      if (err) {
        console.error('Error al enviar la invitación:', err);
        return res.status(500).json({ msg: 'Error al enviar la invitación.' });
      }
      res.status(200).json({ msg: 'Invitación enviada exitosamente.' });
    });

  } catch (error) {
    console.error('Error en /invite:', error.message);
    res.status(500).json({ msg: 'Error en el servidor' });
  }
});

// Ruta para Obtener la Lista de Referidos del Usuario
router.get('/referrals', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('referrals', 'username email');

    if (!user) {
      return res.status(404).json({ msg: 'Usuario no encontrado.' });
    }

    res.json(user.referrals);
  } catch (error) {
    console.error('Error en /referrals:', error.message);
    res.status(500).json({ msg: 'Error en el servidor' });
  }
});

// Ruta para Enviar Correos de Recuperación de Contraseña
router.post('/recover-password', [
  check('email', 'Debe ser un correo electrónico válido').isEmail()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Devolver todos los errores de validación
    return res.status(400).json({ errors: errors.array() });
  }

  const { email } = req.body;

  try {
    // Buscar al usuario por correo electrónico
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'No existe un usuario con ese correo electrónico.' });
    }

    // Generar un token de recuperación
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Establecer el token y su expiración en el usuario
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hora

    await user.save();

    // Crear el enlace de recuperación
    const resetURL = `https://ilitchv.github.io/BestReaderOne/reset_password.html?token=${resetToken}`;

    // Enviar el correo electrónico
    const mailOptions = {
      to: user.email,
      from: process.env.EMAIL_USER,
      subject: 'Recuperación de Contraseña - Beast Reader',
      text: `Hola ${user.username},

Has solicitado restablecer tu contraseña en Beast Reader. Haz clic en el siguiente enlace para restablecerla:

${resetURL}

Este enlace expirará en una hora.

Si no solicitaste este cambio, por favor ignora este correo.

Saludos,
Equipo de Beast Reader`
    };

    transporter.sendMail(mailOptions, (err) => {
      if (err) {
        console.error('Error al enviar el correo de recuperación:', err);
        return res.status(500).json({ msg: 'Error al enviar el correo de recuperación.' });
      }
      res.status(200).json({ msg: 'Correo de recuperación enviado exitosamente.' });
    });

  } catch (error) {
    console.error('Error en /recover-password:', error.message);
    res.status(500).json({ msg: 'Error en el servidor' });
  }
});

// Ruta para Restablecer la Contraseña
router.post('/reset-password', [
  check('token', 'El token es obligatorio').notEmpty(),
  check('newPassword', 'La nueva contraseña debe tener al menos 6 caracteres').isLength({ min: 6 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Devolver todos los errores de validación
    return res.status(400).json({ errors: errors.array() });
  }

  const { token, newPassword } = req.body;

  try {
    // Buscar al usuario con el token válido y no expirado
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ msg: 'Token de recuperación inválido o expirado.' });
    }

    // Actualizar la contraseña
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    // Enviar confirmación por correo electrónico
    const mailOptions = {
      to: user.email,
      from: process.env.EMAIL_USER,
      subject: 'Contraseña Restablecida - Beast Reader',
      text: `Hola ${user.username},

Tu contraseña ha sido restablecida exitosamente.

Si no realizaste este cambio, por favor contacta al soporte de Beast Reader inmediatamente.

Saludos,
Equipo de Beast Reader`
    };

    transporter.sendMail(mailOptions, (err) => {
      if (err) {
        console.error('Error al enviar el correo de confirmación:', err);
        return res.status(500).json({ msg: 'Error al enviar el correo de confirmación.' });
      }
      res.status(200).json({ msg: 'Contraseña restablecida exitosamente.' });
    });

  } catch (error) {
    console.error('Error en /reset-password:', error.message);
    res.status(500).json({ msg: 'Error en el servidor' });
  }
});

// Ruta para Verificar el Token JWT (Opcional)
router.get('/verify-token', authenticateToken, (req, res) => {
  res.json({ msg: 'Token válido.' });
});

// Exportar el router
module.exports = router;
