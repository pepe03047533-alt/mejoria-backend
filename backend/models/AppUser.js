const mongoose = require('mongoose');

/**
 * Usuarios de sesión (invitado / Google) para producción sin SQLite.
 * Colección separada del modelo User legacy de seeds.
 */
const appUserSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    email: { type: String },
    name: String,
    picture: String,
    google_id: { type: String, sparse: true, unique: true },
    is_guest: { type: Boolean, default: false },
    guest_id: { type: String, sparse: true },
  },
  {
    _id: false,
    timestamps: true,
    collection: 'app_users',
  }
);

appUserSchema.index({ guest_id: 1 }, { sparse: true });

module.exports = mongoose.models.AppUser || mongoose.model('AppUser', appUserSchema);
