// emailConfig.js
 
const nodemailer = require('nodemailer');

// Configura el transportador de correo electrónico
let transporter = nodemailer.createTransport({
  service: 'Gmail', // Puedes usar otro servicio de correo si lo prefieres
  auth: {
    user: process.env.ilitchvasquez@gmail.com, // Tu correo electrónico
    pass: process.env.lrlb ylai lapx sngs  // Tu contraseña de aplicación
  }
});

module.exports = transporter;
