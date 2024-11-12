// scripts/updateUsers.js

require('dotenv').config(); // Agrega esta línea al inicio

const mongoose = require('mongoose');
const User = require('../models/User'); // Asegúrate de que la ruta sea correcta

// Configurar la URL de conexión a MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://BeastBetTwo:Amiguito2468@beastbet.lleyk.mongodb.net/beastbetdb?retryWrites=true&w=majority&appName=Beastbet';

// Función principal para actualizar usuarios
const updateUsers = async () => {
  try {
    // Conectar a la base de datos
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Conectado a MongoDB');

    // Definir los usuarios a actualizar con sus datos
    const usersToUpdate = [
      {
        username: 'admin',
        firstName: 'Administrador',
        lastName: 'Principal',
        phoneNumber: '+1234567890',
      },
      {
        username: 'usuario1',
        firstName: 'Usuario',
        lastName: 'Uno',
        phoneNumber: '+1987654321',
      },
      {
        username: 'Mandrix',
        firstName: 'Mandr',
        lastName: 'Ixor',
        phoneNumber: '+1123456789',
      },
    ];

    // Iterar sobre cada usuario y actualizar los campos faltantes
    for (let userData of usersToUpdate) {
      const { username, firstName, lastName, phoneNumber } = userData;

      const user = await User.findOne({ username });

      if (!user) {
        console.log(`Usuario con username "${username}" no encontrado.`);
        continue;
      }

      // Actualizar solo si los campos están ausentes
      let updated = false;
      if (!user.firstName) {
        user.firstName = firstName;
        updated = true;
      }
      if (!user.lastName) {
        user.lastName = lastName;
        updated = true;
      }
      if (!user.phoneNumber) {
        user.phoneNumber = phoneNumber;
        updated = true;
      }

      if (updated) {
        await user.save();
        console.log(`Usuario "${username}" actualizado exitosamente.`);
      } else {
        console.log(`Usuario "${username}" ya tiene todos los campos requeridos.`);
      }
    }

    console.log('Actualización de usuarios completada.');
    mongoose.connection.close();
  } catch (error) {
    console.error('Error al actualizar usuarios:', error);
    mongoose.connection.close();
  }
};

updateUsers();
