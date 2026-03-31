const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  passwordHash: {
    type: String,
    required: true,    // tutaj trzymamy zahaszowane hasło, NIE na czysto
  },
  role: {
    type: String,
    enum: ['admin', 'coach'],
    required: true,
  },
}, {
  timestamps: true,     // createdAt, updatedAt – może się przydać w pracy
});

module.exports = mongoose.model('User', UserSchema);
