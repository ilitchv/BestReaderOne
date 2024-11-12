// test_email.js

const nodemailer = require('nodemailer');

// Configuración de nodemailer
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_USER, // Tu correo de Gmail
    pass: process.env.EMAIL_PASSWORD // Contraseña de aplicación de Gmail
  }
});

// Opciones del correo
const mailOptions = {
  from: process.env.EMAIL_USER,
  to: 'ilitchv@gmail.com', // Cambia por tu correo para probar
  subject: 'Prueba de Envío de Correo',
  text: 'Este es un correo de prueba enviado desde Nodemailer.'
};

// Enviar el correo
transporter.sendMail(mailOptions, (err, info) => {
  if (err) {
    return console.error('Error al enviar el correo:', err);
  }
  console.log('Correo enviado:', info.response);
});
