const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

// Solo usar SQLite en desarrollo local
const useSQLite = process.env.NODE_ENV !== 'production';

let db = null;
let dbService = {};

// Solo inicializar SQLite si no estamos en producción
if (useSQLite) {
  const sqlite3 = require('sqlite3').verbose();
  
  const DB_DIR = path.join(__dirname, '..', 'data');
  const DB_PATH = path.join(DB_DIR, 'mejoria.db');

  // Asegurar que existe el directorio
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      console.error('Error conectando a SQLite:', err.message);
    } else {
      console.log('✅ SQLite conectado');
      initTables();
    }
  });

  function initTables() {
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE,
          name TEXT,
          picture TEXT,
          google_id TEXT UNIQUE,
          is_guest BOOLEAN DEFAULT 0,
          guest_id TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_login DATETIME,
          last_seen DATETIME
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS user_sessions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          session_token TEXT UNIQUE,
          device TEXT,
          ip TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          expires_at DATETIME,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS search_history (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          query TEXT NOT NULL,
          filters TEXT,
          results_count INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS product_views (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          product_url TEXT NOT NULL,
          product_title TEXT,
          product_price INTEGER,
          product_store TEXT,
          viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS user_decisions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          search_query TEXT,
          chosen_product_url TEXT,
          chosen_product_title TEXT,
          comparison_data TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS user_merges (
          id TEXT PRIMARY KEY,
          old_guest_id TEXT NOT NULL,
          new_user_id TEXT NOT NULL,
          merged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (new_user_id) REFERENCES users(id)
        )
      `);

      db.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_users_guest ON users(guest_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(session_token)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_search_history_user ON search_history(user_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_search_history_date ON search_history(created_at)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_product_views_user ON product_views(user_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_product_views_date ON product_views(viewed_at)`);
      
      console.log('✅ Tablas de usuarios y tracking creadas');
    });
  }
}

// Funciones helper
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

dbService = {
  createUser: (name, email, password) => {
    return new Promise((resolve, reject) => {
      if (!db) return reject(new Error('SQLite no disponible'));
      const id = generateId();
      const hashedPassword = bcrypt.hashSync(password, 10);
      db.run(
        'INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)',
        [id, name, email, hashedPassword],
        function(err) {
          if (err) reject(err);
          else resolve({ id, name, email });
        }
      );
    });
  },

  getUserByEmail: (email) => {
    return new Promise((resolve, reject) => {
      if (!db) return reject(new Error('SQLite no disponible'));
      db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  validatePassword: (user, password) => {
    return bcrypt.compareSync(password, user.password);
  },

  updateLastLogin: (userId) => {
    return new Promise((resolve, reject) => {
      if (!db) return reject(new Error('SQLite no disponible'));
      db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [userId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  },

  getAllUsers: () => {
    return new Promise((resolve, reject) => {
      if (!db) return reject(new Error('SQLite no disponible'));
      db.all('SELECT id, name, email, role, created_at, last_login FROM users ORDER BY created_at DESC', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },

  createGuestUser: (guestId) => {
    return new Promise((resolve, reject) => {
      if (!db) return reject(new Error('SQLite no disponible'));
      const id = generateId();
      db.run(
        'INSERT INTO users (id, name, is_guest, guest_id, last_seen) VALUES (?, ?, 1, ?, datetime("now"))',
        [id, 'Invitado', guestId],
        function(err) {
          if (err) reject(err);
          else resolve({ id, name: 'Invitado', is_guest: true, guest_id: guestId });
        }
      );
    });
  },

  createOrUpdateGoogleUser: (googleProfile) => {
    return new Promise((resolve, reject) => {
      if (!db) return reject(new Error('SQLite no disponible'));
      const { id: google_id, emails, displayName: name, photos } = googleProfile;
      const email = emails?.[0]?.value;
      const picture = photos?.[0]?.value;

      db.get('SELECT * FROM users WHERE google_id = ?', [google_id], (err, existing) => {
        if (err) return reject(err);

        if (existing) {
          db.run(
            'UPDATE users SET last_login = datetime("now"), last_seen = datetime("now"), name = ?, picture = ? WHERE id = ?',
            [name, picture, existing.id],
            () => resolve({ ...existing, name, picture, last_login: new Date() })
          );
        } else {
          const id = generateId();
          db.run(
            'INSERT INTO users (id, email, name, picture, google_id, is_guest, created_at, last_login, last_seen) VALUES (?, ?, ?, ?, ?, 0, datetime("now"), datetime("now"), datetime("now"))',
            [id, email, name, picture, google_id],
            function(err) {
              if (err) reject(err);
              else resolve({ id, email, name, picture, google_id, is_guest: false });
            }
          );
        }
      });
    });
  },

  getUserById: (userId) => {
    return new Promise((resolve, reject) => {
      if (!db) return reject(new Error('SQLite no disponible'));
      db.get('SELECT * FROM users WHERE id = ?', [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  getUserByGuestId: (guestId) => {
    return new Promise((resolve, reject) => {
      if (!db) return reject(new Error('SQLite no disponible'));
      db.get('SELECT * FROM users WHERE guest_id = ? AND is_guest = 1', [guestId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  mergeGuestToUser: (guestId, userId) => {
    return new Promise(async (resolve, reject) => {
      if (!db) return reject(new Error('SQLite no disponible'));
      try {
        await new Promise((res, rej) => {
          db.run('UPDATE search_history SET user_id = ? WHERE user_id = ?', [userId, guestId], (err) => err ? rej(err) : res());
        });
        await new Promise((res, rej) => {
          db.run('UPDATE product_views SET user_id = ? WHERE user_id = ?', [userId, guestId], (err) => err ? rej(err) : res());
        });
        await new Promise((res, rej) => {
          db.run('UPDATE user_decisions SET user_id = ? WHERE user_id = ?', [userId, guestId], (err) => err ? rej(err) : res());
        });
        await new Promise((res, rej) => {
          db.run('INSERT INTO user_merges (id, old_guest_id, new_user_id) VALUES (?, ?, ?)', [generateId(), guestId, userId], (err) => err ? rej(err) : res());
        });
        await new Promise((res, rej) => {
          db.run('DELETE FROM users WHERE id = ? AND is_guest = 1', [guestId], (err) => err ? rej(err) : res());
        });
        resolve({ success: true });
      } catch (err) {
        reject(err);
      }
    });
  },

  updateLastSeen: (userId) => {
    return new Promise((resolve, reject) => {
      if (!db) return reject(new Error('SQLite no disponible'));
      db.run('UPDATE users SET last_seen = datetime("now") WHERE id = ?', [userId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  },

  logSearchHistory: (userId, query, filters, resultsCount) => {
    return new Promise((resolve, reject) => {
      if (!db) return reject(new Error('SQLite no disponible'));
      const id = generateId();
      db.run(
        'INSERT INTO search_history (id, user_id, query, filters, results_count) VALUES (?, ?, ?, ?, ?)',
        [id, userId, query, JSON.stringify(filters), resultsCount],
        function(err) {
          if (err) reject(err);
          else resolve({ id, query });
        }
      );
    });
  },

  logProductView: (userId, product) => {
    return new Promise((resolve, reject) => {
      if (!db) return reject(new Error('SQLite no disponible'));
      const id = generateId();
      db.run(
        'INSERT INTO product_views (id, user_id, product_url, product_title, product_price, product_store) VALUES (?, ?, ?, ?, ?, ?)',
        [id, userId, product.url, product.titulo, product.precio, product.tienda],
        function(err) {
          if (err) reject(err);
          else resolve({ id });
        }
      );
    });
  },

  logUserDecision: (userId, searchQuery, chosenProduct, comparisonData) => {
    return new Promise((resolve, reject) => {
      if (!db) return reject(new Error('SQLite no disponible'));
      const id = generateId();
      db.run(
        'INSERT INTO user_decisions (id, user_id, search_query, chosen_product_url, chosen_product_title, comparison_data) VALUES (?, ?, ?, ?, ?, ?)',
        [id, userId, searchQuery, chosenProduct?.url, chosenProduct?.titulo, JSON.stringify(comparisonData)],
        function(err) {
          if (err) reject(err);
          else resolve({ id });
        }
      );
    });
  },

  getUserSearchHistory: (userId, limit = 10) => {
    return new Promise((resolve, reject) => {
      if (!db) return reject(new Error('SQLite no disponible'));
      db.all(
        'SELECT * FROM search_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
        [userId, limit],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows.map(r => ({ ...r, filters: JSON.parse(r.filters || '{}') })));
        }
      );
    });
  },

  getUserProductViews: (userId, limit = 10) => {
    return new Promise((resolve, reject) => {
      if (!db) return reject(new Error('SQLite no disponible'));
      db.all(
        'SELECT * FROM product_views WHERE user_id = ? ORDER BY viewed_at DESC LIMIT ?',
        [userId, limit],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  getUserDecisions: (userId, limit = 10) => {
    return new Promise((resolve, reject) => {
      if (!db) return reject(new Error('SQLite no disponible'));
      db.all(
        'SELECT * FROM user_decisions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
        [userId, limit],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows.map(r => ({ ...r, comparison_data: JSON.parse(r.comparison_data || '{}') })));
        }
      );
    });
  },

  getUserProfile: (userId) => {
    return new Promise((resolve, reject) => {
      if (!db) return reject(new Error('SQLite no disponible'));
      db.get(
        `SELECT u.*,
          (SELECT COUNT(*) FROM search_history WHERE user_id = u.id) as total_searches,
          (SELECT COUNT(*) FROM product_views WHERE user_id = u.id) as total_views,
          (SELECT COUNT(*) FROM user_decisions WHERE user_id = u.id) as total_decisions
         FROM users u WHERE u.id = ?`,
        [userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }
};

module.exports = { db, dbService, generateId };