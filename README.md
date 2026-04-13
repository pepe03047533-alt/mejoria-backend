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

## Deploy

- **Frontend** → [vercel.com](https://vercel.com): importar carpeta `frontend/`, agregar `VITE_API_URL=https://tu-backend.railway.app`
- **Backend** → [railway.app](https://railway.app): importar carpeta `backend/`, agregar variables de entorno
