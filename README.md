# MejorIA — La forma más inteligente de comprar

Buscador inteligente de productos para Argentina con IA asistente, búsqueda por voz y resultados de MercadoLibre, Frávega, Garbarino y más.

## Inicio rápido

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Editar .env con tus claves API
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Abrí http://localhost:5173

## Variables de entorno

| Variable | Dónde obtenerla | Requerida |
|---|---|---|
| `GEMINI_API_KEY` | [aistudio.google.com](https://aistudio.google.com) | Recomendada (gratis) |
| `MERCADOLIBRE_APP_ID` | [developers.mercadolibre.com](https://developers.mercadolibre.com) | Opcional (funciona sin clave) |
| `SERPAPI_KEY` | [serpapi.com](https://serpapi.com) | Opcional (50 búsquedas/mes gratis) |

## Deploy (recomendado: monolito en Vercel)

Funciona con **Root Directory** = `frontend` (recomendado, el que ya usás) o con la raíz del repo.

- **`frontend/`**: en cada build se copia `api/` → `frontend/server/` y Vercel expone `/api/*` vía `frontend/api/index.cjs`.
- **Raíz del repo**: `vercel.json` en la raíz (builds clásicos).

1. En Vercel: **Root Directory** = `frontend` (o `.` si preferís monolito desde raíz)
2. Variables de entorno (proyecto): `GEMINI_API_KEY`, `MONGODB_URI` o `MONGO_URL`, `MERCADOLIBRE_*`, `JWT_SECRET`, etc.
3. Dominio `www.mejoria.com.ar` apuntando a ese proyecto
4. **No hace falta** `VITE_API_URL` si front y API comparten dominio

### Desarrollo local

```bash
# Terminal 1 — API
npm install && npm run dev

# Terminal 2 — Frontend (proxy /api → :3001)
cd frontend && npm install && npm run dev
```

### Backend alternativo (Railway)

Si el API corre en otro host, definí en Vercel (build del frontend): `VITE_API_URL=https://tu-app.railway.app`
