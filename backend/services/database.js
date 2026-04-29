const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DB_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DB_DIR, 'mejoria.db');

// Asegurar que existe el directorio
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error conectando a SQLite:', err.message);
  } else {
    console.log('✅ SQLite conectado');
    initTables();
  }
});

function initTables() {
  db.serialize(() => {
    // Tabla de usuarios con soporte para Google OAuth
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

    // Tabla de sesiones de usuario
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

    // Tabla de historial de búsquedas (mejorada)
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

    // Tabla de productos vistos
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

    // Tabla de decisiones/comparaciones
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

    // Tabla de unificación (para merge de invitado a usuario real)
    db.run(`
      CREATE TABLE IF NOT EXISTS user_merges (
        id TEXT PRIMARY KEY,
        old_guest_id TEXT NOT NULL,
        new_user_id TEXT NOT NULL,
        merged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (new_user_id) REFERENCES users(id)
      )
    `);

    // Índices para optimización
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

// Funciones helper
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

const dbService = {
  // Usuarios
  createUser: (name, email, password) => {
    return new Promise((resolve, reject) => {
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
      db.run(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
        [userId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  },

  getAllUsers: () => {
    return new Promise((resolve, reject) => {
      db.all('SELECT id, name, email, role, created_at, last_login FROM users ORDER BY created_at DESC', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },

  // Sesiones
  createSession: (userId, device, ip) => {
    return new Promise((resolve, reject) => {
      const id = generateId();
      db.run(
        'INSERT INTO sessions (id, user_id, device, ip) VALUES (?, ?, ?, ?)',
        [id, userId, device, ip],
        function(err) {
          if (err) reject(err);
          else resolve({ id, userId, device, ip });
        }
      );
    });
  },

  // Búsquedas
  logSearch: (userId, query, filters, resultsCount) => {
    return new Promise((resolve, reject) => {
      const id = generateId();
      db.run(
        'INSERT INTO searches (id, user_id, query, filters, results_count) VALUES (?, ?, ?, ?, ?)',
        [id, userId, query, JSON.stringify(filters), resultsCount],
        function(err) {
          if (err) reject(err);
          else resolve({ id, query, resultsCount });
        }
      );
    });
  },

  getUserSearches: (userId, limit = 10) => {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM searches WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
        [userId, limit],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows.map(r => ({ ...r, filters: JSON.parse(r.filters || '{}') })));
        }
      );
    });
  },

  getRecentSearches: (limit = 20) => {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT s.*, u.name as user_name, u.email 
         FROM searches s 
         LEFT JOIN users u ON s.user_id = u.id 
         ORDER BY s.created_at DESC LIMIT ?`,
        [limit],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows.map(r => ({ ...r, filters: JSON.parse(r.filters || '{}') })));
        }
      );
    });
  },

  // Interacciones
  logInteraction: (userId, product, action, metadata = {}) => {
    return new Promise((resolve, reject) => {
      const id = generateId();
      const productId = product.url?.match(/(MLA|MLU)-\d+/)?.[0] || product.url;
      
      db.run(
        `INSERT INTO interactions 
         (id, user_id, product_id, product_url, product_title, product_price, product_store, action, metadata) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          userId,
          productId,
          product.url,
          product.titulo,
          product.precio,
          product.tienda,
          action,
          JSON.stringify(metadata)
        ],
        function(err) {
          if (err) reject(err);
          else resolve({ id, action, productId });
        }
      );
    });
  },

  getUserInteractions: (userId, action = null, limit = 50) => {
    return new Promise((resolve, reject) => {
      let sql = 'SELECT * FROM interactions WHERE user_id = ?';
      const params = [userId];
      
      if (action) {
        sql += ' AND action = ?';
        params.push(action);
      }
      
      sql += ' ORDER BY created_at DESC LIMIT ?';
      params.push(limit);
      
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows.map(r => ({ ...r, metadata: JSON.parse(r.metadata || '{}') })));
      });
    });
  },

  getRecentInteractions: (limit = 50) => {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT i.*, u.name as user_name 
         FROM interactions i 
         LEFT JOIN users u ON i.user_id = u.id 
         ORDER BY i.created_at DESC LIMIT ?`,
        [limit],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows.map(r => ({ ...r, metadata: JSON.parse(r.metadata || '{}') })));
        }
      );
    });
  },

  // Estadísticas
  getPopularSearches: (limit = 10) => {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT query, COUNT(*) as count 
         FROM searches 
         GROUP BY query 
         ORDER BY count DESC 
         LIMIT ?`,
        [limit],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  getStats: () => {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT 
          (SELECT COUNT(*) FROM users) as total_users,
          (SELECT COUNT(*) FROM users WHERE role = 'admin') as admin_users,
          (SELECT COUNT(*) FROM searches) as total_searches,
          (SELECT COUNT(*) FROM interactions) as total_interactions,
          (SELECT COUNT(*) FROM interactions WHERE action = 'click') as total_clicks,
          (SELECT COUNT(*) FROM interactions WHERE action = 'view') as total_views,
          (SELECT COUNT(*) FROM interactions WHERE action = 'save') as total_saves,
          (SELECT COUNT(DISTINCT user_id) FROM searches) as active_users`,
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  },

  // ========== GESTIÓN DE USUARIOS ==========

  // Crear usuario invitado
  createGuestUser: (guestId) => {
    return new Promise((resolve, reject) => {
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

  // Crear o actualizar usuario de Google
  createOrUpdateGoogleUser: (googleProfile) => {
    return new Promise((resolve, reject) => {
      const { id: google_id, emails, displayName: name, photos } = googleProfile;
      const email = emails?.[0]?.value;
      const picture = photos?.[0]?.value;

      // Buscar si ya existe
      db.get('SELECT * FROM users WHERE google_id = ?', [google_id], (err, existing) => {
        if (err) return reject(err);

        if (existing) {
          // Actualizar último login
          db.run(
            'UPDATE users SET last_login = datetime("now"), last_seen = datetime("now"), name = ?, picture = ? WHERE id = ?',
            [name, picture, existing.id],
            () => resolve({ ...existing, name, picture, last_login: new Date() })
          );
        } else {
          // Crear nuevo usuario
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

  // Buscar usuario por ID
  getUserById: (userId) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE id = ?', [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  // Buscar usuario por guest_id
  getUserByGuestId: (guestId) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE guest_id = ? AND is_guest = 1', [guestId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  // Unificar historial de invitado a usuario real
  mergeGuestToUser: (guestId, userId) => {
    return new Promise(async (resolve, reject) => {
      try {
        // Actualizar search_history
        await new Promise((res, rej) => {
          db.run('UPDATE search_history SET user_id = ? WHERE user_id = ?', [userId, guestId], (err) => err ? rej(err) : res());
        });

        // Actualizar product_views
        await new Promise((res, rej) => {
          db.run('UPDATE product_views SET user_id = ? WHERE user_id = ?', [userId, guestId], (err) => err ? rej(err) : res());
        });

        // Actualizar user_decisions
        await new Promise((res, rej) => {
          db.run('UPDATE user_decisions SET user_id = ? WHERE user_id = ?', [userId, guestId], (err) => err ? rej(err) : res());
        });

        // Registrar el merge
        await new Promise((res, rej) => {
          db.run('INSERT INTO user_merges (id, old_guest_id, new_user_id) VALUES (?, ?, ?)', 
            [generateId(), guestId, userId], (err) => err ? rej(err) : res());
        });

        // Eliminar usuario invitado
        await new Promise((res, rej) => {
          db.run('DELETE FROM users WHERE id = ? AND is_guest = 1', [guestId], (err) => err ? rej(err) : res());
        });

        resolve({ success: true });
      } catch (err) {
        reject(err);
      }
    });
  },

  // Actualizar last_seen
  updateLastSeen: (userId) => {
    return new Promise((resolve, reject) => {
      db.run('UPDATE users SET last_seen = datetime("now") WHERE id = ?', [userId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  },

  // ========== TRACKING DE COMPORTAMIENTO ==========

  // Registrar búsqueda
  logSearchHistory: (userId, query, filters, resultsCount) => {
    return new Promise((resolve, reject) => {
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

  // Registrar producto visto
  logProductView: (userId, product) => {
    return new Promise((resolve, reject) => {
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

  // Registrar decisión/comparación
  logUserDecision: (userId, searchQuery, chosenProduct, comparisonData) => {
    return new Promise((resolve, reject) => {
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

  // ========== HISTORIAL DEL USUARIO ==========

  // Obtener últimas búsquedas del usuario
  getUserSearchHistory: (userId, limit = 10) => {
    return new Promise((resolve, reject) => {
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

  // Obtener productos vistos recientemente
  getUserProductViews: (userId, limit = 10) => {
    return new Promise((resolve, reject) => {
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

  // Obtener decisiones del usuario
  getUserDecisions: (userId, limit = 10) => {
    return new Promise((resolve, reject) => {
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

  // Obtener perfil completo del usuario con estadísticas
  getUserProfile: (userId) => {
    return new Promise((resolve, reject) => {
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
  },
};

module.exports = { db, dbService, generateId };
