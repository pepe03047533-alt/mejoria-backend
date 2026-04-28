const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Conexión a PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Inicializar tablas
async function initTables() {
  const client = await pool.connect();
  try {
    // Tabla de usuarios
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE,
        name TEXT,
        picture TEXT,
        google_id TEXT UNIQUE,
        is_guest BOOLEAN DEFAULT FALSE,
        guest_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP,
        last_seen TIMESTAMP
      )
    `);

    // Tabla de sesiones
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        session_token TEXT UNIQUE,
        device TEXT,
        ip TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP
      )
    `);

    // Tabla de historial de búsquedas
    await client.query(`
      CREATE TABLE IF NOT EXISTS search_history (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        query TEXT NOT NULL,
        filters TEXT,
        results_count INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de productos vistos
    await client.query(`
      CREATE TABLE IF NOT EXISTS product_views (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        product_url TEXT NOT NULL,
        product_title TEXT,
        product_price INTEGER,
        product_store TEXT,
        viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de decisiones
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_decisions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        search_query TEXT,
        chosen_product_url TEXT,
        chosen_product_title TEXT,
        comparison_data TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de merges
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_merges (
        id TEXT PRIMARY KEY,
        old_guest_id TEXT NOT NULL,
        new_user_id TEXT NOT NULL,
        merged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Tablas de PostgreSQL creadas');
  } catch (err) {
    console.error('Error creando tablas:', err);
  } finally {
    client.release();
  }
}

// Inicializar al conectar
pool.on('connect', () => {
  console.log('✅ PostgreSQL conectado');
  initTables();
});

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

const dbService = {
  // Usuarios
  createUser: async (name, email, password) => {
    const id = generateId();
    const hashedPassword = bcrypt.hashSync(password, 10);
    const result = await pool.query(
      'INSERT INTO users (id, name, email, password) VALUES ($1, $2, $3, $4) RETURNING *',
      [id, name, email, hashedPassword]
    );
    return result.rows[0];
  },

  getUserByEmail: async (email) => {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0];
  },

  validatePassword: (user, password) => {
    return bcrypt.compareSync(password, user.password);
  },

  updateLastLogin: async (userId) => {
    await pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [userId]
    );
  },

  getAllUsers: async () => {
    const result = await pool.query(
      'SELECT id, name, email, created_at, last_login FROM users ORDER BY created_at DESC'
    );
    return result.rows;
  },

  // Sesiones
  createSession: async (userId, device, ip) => {
    const id = generateId();
    const result = await pool.query(
      'INSERT INTO user_sessions (id, user_id, device, ip) VALUES ($1, $2, $3, $4) RETURNING *',
      [id, userId, device, ip]
    );
    return result.rows[0];
  },

  // Búsquedas
  logSearch: async (userId, query, filters, resultsCount) => {
    const id = generateId();
    const result = await pool.query(
      'INSERT INTO search_history (id, user_id, query, filters, results_count) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [id, userId, query, JSON.stringify(filters), resultsCount]
    );
    return result.rows[0];
  },

  getUserSearches: async (userId, limit = 10) => {
    const result = await pool.query(
      'SELECT * FROM search_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
      [userId, limit]
    );
    return result.rows.map(r => ({ ...r, filters: JSON.parse(r.filters || '{}') }));
  },

  getRecentSearches: async (limit = 20) => {
    const result = await pool.query(
      `SELECT s.*, u.name as user_name 
       FROM search_history s 
       LEFT JOIN users u ON s.user_id = u.id 
       ORDER BY s.created_at DESC LIMIT $1`,
      [limit]
    );
    return result.rows.map(r => ({ ...r, filters: JSON.parse(r.filters || '{}') }));
  },

  // Usuario invitado
  createGuestUser: async (guestId) => {
    const id = generateId();
    const result = await pool.query(
      'INSERT INTO users (id, name, is_guest, guest_id, last_seen) VALUES ($1, $2, TRUE, $3, NOW()) RETURNING *',
      [id, 'Invitado', guestId]
    );
    return result.rows[0];
  },

  // Google User
  createOrUpdateGoogleUser: async (googleProfile) => {
    const { id: google_id, emails, displayName: name, photos } = googleProfile;
    const email = emails?.[0]?.value;
    const picture = photos?.[0]?.value;

    const existing = await pool.query('SELECT * FROM users WHERE google_id = $1', [google_id]);
    
    if (existing.rows[0]) {
      await pool.query(
        'UPDATE users SET last_login = NOW(), last_seen = NOW(), name = $1, picture = $2 WHERE id = $3',
        [name, picture, existing.rows[0].id]
      );
      return { ...existing.rows[0], name, picture, last_login: new Date() };
    } else {
      const id = generateId();
      const result = await pool.query(
        'INSERT INTO users (id, email, name, picture, google_id, is_guest, created_at, last_login, last_seen) VALUES ($1, $2, $3, $4, $5, FALSE, NOW(), NOW(), NOW()) RETURNING *',
        [id, email, name, picture, google_id]
      );
      return result.rows[0];
    }
  },

  getUserById: async (userId) => {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    return result.rows[0];
  },

  getUserByGuestId: async (guestId) => {
    const result = await pool.query('SELECT * FROM users WHERE guest_id = $1 AND is_guest = TRUE', [guestId]);
    return result.rows[0];
  },

  updateLastSeen: async (userId) => {
    await pool.query('UPDATE users SET last_seen = NOW() WHERE id = $1', [userId]);
  },

  // Historial
  logSearchHistory: async (userId, query, filters, resultsCount) => {
    const id = generateId();
    await pool.query(
      'INSERT INTO search_history (id, user_id, query, filters, results_count) VALUES ($1, $2, $3, $4, $5)',
      [id, userId, query, JSON.stringify(filters), resultsCount]
    );
    return { id, query };
  },

  logProductView: async (userId, product) => {
    const id = generateId();
    await pool.query(
      'INSERT INTO product_views (id, user_id, product_url, product_title, product_price, product_store) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, userId, product.url, product.titulo, product.precio, product.tienda]
    );
    return { id };
  },

  getUserSearchHistory: async (userId, limit = 10) => {
    const result = await pool.query(
      'SELECT * FROM search_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
      [userId, limit]
    );
    return result.rows.map(r => ({ ...r, filters: JSON.parse(r.filters || '{}') }));
  },

  getUserProfile: async (userId) => {
    const result = await pool.query(
      `SELECT u.*,
        (SELECT COUNT(*) FROM search_history WHERE user_id = u.id) as total_searches,
        (SELECT COUNT(*) FROM product_views WHERE user_id = u.id) as total_views
       FROM users u WHERE u.id = $1`,
      [userId]
    );
    return result.rows[0];
  }
};

module.exports = { pool, dbService, generateId };
