 // models/InvitationCode.js

const mongoose = require('mongoose');

const invitationCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  used: {
    type: Boolean,
    default: false
  },
  usedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  dateCreated: {
    type: Date,
    default: Date.now,
    expires: '24h' // El código expirará automáticamente después de 24 horas
  },
  dateUsed: {
    type: Date
  }
});

module.exports = mongoose.model('InvitationCode', invitationCodeSchema);
