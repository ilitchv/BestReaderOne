 // models/User.js

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Definir el esquema del usuario
const userSchema = new mongoose.Schema({
  firstName: { 
    type: String, 
    required: false 
  },
  lastName: { 
    type: String, 
    required: false 
  },
  phoneNumber: { 
    type: String, 
    required: false,
    match: [/^\+?[1-9]\d{1,14}$/, 'Por favor, ingresa un número de teléfono válido.']
  },
  username: { 
    type: String, 
    required: true, 
    unique: true 
  },
  password: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    match: [/\S+@\S+\.\S+/, 'Por favor, ingresa un correo electrónico válido.']
  },
  role: { 
    type: String, 
    enum: ['admin', 'user'], 
    default: 'user' 
  },
  referralCode: { 
    type: String, 
    unique: true 
  }, // Código de referido personal
  referredBy: { 
    type: String,
    default: null
  },   // Código de referido utilizado en el registro
  referrals: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }], // Usuarios referidos por este usuario
  isActive: { 
    type: Boolean, 
    default: true 
  },
  dateCreated: { 
    type: Date, 
    default: Date.now 
  },
  balance: { 
    type: Number, 
    default: 0 
  },
  // Campos para recuperación de contraseña
  resetPasswordToken: { 
    type: String 
  },
  resetPasswordExpires: { 
    type: Date 
  }
});

// Middleware para generar un código de referido y encriptar la contraseña antes de guardar
userSchema.pre('save', async function(next) {
  try {
    // Generar código de referido si no existe
    if (!this.referralCode) {
      this.referralCode = generateReferralCode();
    }

    // Encriptar la contraseña si ha sido modificada
    if (this.isModified('password')) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Método para comparar contraseñas
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Función para generar un código de referido único
function generateReferralCode() {
  const length = 8;
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

module.exports = mongoose.model('User', userSchema);
