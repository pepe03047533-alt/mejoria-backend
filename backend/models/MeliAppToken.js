const mongoose = require('mongoose');

const meliAppTokenSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'default', unique: true },
    access_token: String,
    refresh_token: String,
    expires_at: Number,
  },
  { timestamps: true }
);

module.exports = mongoose.models.MeliAppToken || mongoose.model('MeliAppToken', meliAppTokenSchema);
