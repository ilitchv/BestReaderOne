 // app.js

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Crear una instancia de Express
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Conexión a MongoDB Atlas
const uri = process.env.MONGODB_URI;
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Conectado a MongoDB Atlas'))
  .catch(error => console.error('Error al conectar a MongoDB Atlas:', error));

// Importar las rutas
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users'); // Descomentado
const jugadaRoutes = require('./routes/Jugadas'); // Descomentado

// Usar las rutas
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes); // Descomentado
app.use('/api/jugadas', jugadaRoutes); // Descomentado

// Ruta de prueba para verificar que el servidor funciona
app.get('/', (req, res) => {
  res.send('Servidor funcionando correctamente');
});

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
