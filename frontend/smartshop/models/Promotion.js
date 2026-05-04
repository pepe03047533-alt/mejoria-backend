const mongoose = require('mongoose');

const promotionSchema = new mongoose.Schema({
  store_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: [true, 'La tienda es obligatoria']
  },
  discount: {
    type: Number,
    required: [true, 'El descuento es obligatorio'],
    min: [0, 'El descuento mínimo es 0'],
    max: [1, 'El descuento máximo es 1 (100%)']
  },
  payment_method: {
    type: String,
    required: [true, 'El método de pago es obligatorio'],
    lowercase: true,
    trim: true
  },
  days: [{
    type: String,
    required: true,
    lowercase: true,
    enum: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']
  }],
  active: {
    type: Boolean,
    default: true
  },
  category: {
    type: String,
    required: [true, 'La categoría es obligatoria'],
    lowercase: true,
    trim: true
  }
}, {
  timestamps: true
});

// Índices para consultas frecuentes
promotionSchema.index({ store_id: 1 });
promotionSchema.index({ category: 1 });
promotionSchema.index({ days: 1 });
promotionSchema.index({ payment_method: 1 });
promotionSchema.index({ active: 1 });

module.exports = mongoose.model('Promotion', promotionSchema);
