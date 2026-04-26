const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nombre de la tienda es obligatorio'],
    trim: true,
    maxlength: [100, 'El nombre no puede exceder 100 caracteres']
  },
  categories: [{
    type: String,
    required: true,
    lowercase: true,
    trim: true
  }],
  price_level: {
    type: Number,
    required: [true, 'El nivel de precio es obligatorio'],
    min: [1, 'El nivel mínimo es 1'],
    max: [5, 'El nivel máximo es 5']
  },
  location: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null }
  }
}, {
  timestamps: true
});

// Índices para búsquedas eficientes
storeSchema.index({ categories: 1 });
storeSchema.index({ price_level: 1 });

module.exports = mongoose.model('Store', storeSchema);
