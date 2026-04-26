const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nombre es obligatorio'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'El email es obligatorio'],
    unique: true,
    lowercase: true,
    trim: true
  },
  payment_methods: [{
    type: String,
    required: true,
    lowercase: true,
    trim: true
  }],
  location: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null }
  }
}, {
  timestamps: true
});

// Índice para búsqueda por email
userSchema.index({ email: 1 });

module.exports = mongoose.model('User', userSchema);
