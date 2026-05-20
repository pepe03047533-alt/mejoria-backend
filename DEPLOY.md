# Deploy MejorIA en Vercel

## Proyecto con dominio www.mejoria.com.ar

### 1. Conexión Git

- Repo: `pepe03047533-alt/mejoria-backend`
- Rama: `main`
- **Root Directory:** `frontend`

### 2. Variables de entorno (proyecto Vercel)

| Variable | Requerida |
|----------|-----------|
| `MONGODB_URI` o `MONGO_URL` | Sí (prod) |
| `GEMINI_API_KEY` | Recomendada |
| `JWT_SECRET` | Sí (auth) |
| `MERCADOLIBRE_APP_ID` | OAuth ML |
| `MERCADOLIBRE_SECRET_KEY` | OAuth ML |
| `MERCADOLIBRE_REDIRECT_URI` | `https://www.mejoria.com.ar/auth/callback` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Login Google |

**Eliminar** `VITE_API_URL` si apunta a Railway (el front usa el mismo dominio).

### 3. Verificar deploy

Tras el build, en el deployment → **Functions** debe aparecer `api/index.js`.

Probar:

```text
https://www.mejoria.com.ar/api/health
```

Respuesta esperada: JSON `{"status":"ok",...}`

### 4. Si sigue 404

- Revisar que **Root Directory** sea `frontend`, no la raíz vacía sin `frontend/vercel.json`.
- **Redeploy** sin caché.
- Logs de build: debe verse `sync-server: listo → frontend/server/`.

### 5. CLI (opcional)

```bash
cd frontend
npx vercel login
npx vercel link
npx vercel env pull
npx vercel --prod
```

Token: [vercel.com/account/tokens](https://vercel.com/account/tokens) → `VERCEL_TOKEN`.
