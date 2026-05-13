const mongoose = require('mongoose');
const AppUser = require('../models/AppUser');
const { getMongoUri } = require('../utils/mongoUri');

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function isReady() {
  return Boolean(getMongoUri()) && mongoose.connection.readyState === 1;
}

/** Espera a que mongoose termine de conectar (evita fallos en el primer request). */
async function ensureMongoConnected(timeoutMs = 15000) {
  if (!getMongoUri()) return false;
  if (mongoose.connection.readyState === 1) return true;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await new Promise((r) => setTimeout(r, 120));
    if (mongoose.connection.readyState === 1) return true;
  }
  return mongoose.connection.readyState === 1;
}

/** Formato compatible con filas SQLite usadas por auth / userHistory */
function mapDoc(doc) {
  if (!doc) return null;
  const row = {
    id: doc._id,
    email: doc.email,
    name: doc.name,
    picture: doc.picture,
    google_id: doc.google_id,
    guest_id: doc.guest_id,
    is_guest: doc.is_guest ? 1 : 0,
  };
  return row;
}

async function createGuestUser(guestId) {
  const id = generateId();
  await AppUser.create({
    _id: id,
    name: 'Invitado',
    is_guest: true,
    guest_id: guestId,
  });
  return { id, name: 'Invitado', is_guest: true, guest_id: guestId };
}

async function getUserByGuestId(guestId) {
  const doc = await AppUser.findOne({ guest_id: guestId, is_guest: true }).lean();
  return mapDoc(doc);
}

async function getUserById(userId) {
  const doc = await AppUser.findById(userId).lean();
  return mapDoc(doc);
}

async function updateLastSeen(userId) {
  await AppUser.updateOne({ _id: userId }, { $set: { updatedAt: new Date() } });
}

async function createOrUpdateGoogleUser(googleProfile) {
  const { id: google_id, emails, displayName: name, photos } = googleProfile;
  const email = emails?.[0]?.value;
  const picture = photos?.[0]?.value;

  let doc = await AppUser.findOne({ google_id }).lean();
  if (doc) {
    await AppUser.updateOne(
      { _id: doc._id },
      { $set: { name, picture, email, updatedAt: new Date() } }
    );
    doc = await AppUser.findById(doc._id).lean();
    return { ...mapDoc(doc), last_login: new Date() };
  }
  const id = generateId();
  await AppUser.create({
    _id: id,
    email,
    name,
    picture,
    google_id,
    is_guest: false,
  });
  doc = await AppUser.findById(id).lean();
  return { ...mapDoc(doc), is_guest: false };
}

async function mergeGuestToUser(guestInternalId, newUserId) {
  await AppUser.deleteOne({ _id: guestInternalId, is_guest: true });
  return { success: true };
}

async function getUserProfile(userId) {
  const doc = await AppUser.findById(userId).lean();
  if (!doc) return null;
  const row = mapDoc(doc);
  return {
    ...row,
    total_searches: 0,
    total_views: 0,
    total_decisions: 0,
  };
}

module.exports = {
  isReady,
  ensureMongoConnected,
  createGuestUser,
  getUserByGuestId,
  getUserById,
  updateLastSeen,
  createOrUpdateGoogleUser,
  mergeGuestToUser,
  getUserProfile,
};
