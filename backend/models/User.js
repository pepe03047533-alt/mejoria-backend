const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'El email es obligatorio'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'La contraseña es obligatoria'],
    minlength: 6
  },
  payment_methods: [{
    type: String,
    lowercase: true,
    trim: true
  }],
  preferences: {
    favorite_categories: [String],
    preferred_stores: [mongoose.Schema.Types.ObjectId]
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
