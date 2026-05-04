# 🛒 Shopping Recommendation Engine

Motor de recomendaciones de compras basado en promociones para Argentina. Encuentra los mejores lugares para comprar HOY según descuentos y medios de pago.

## 🎯 Características

- 🔍 Búsqueda por categoría (carnes, limpieza, bebidas, lácteos)
- 💳 Filtrado por medios de pago del usuario
- 📅 Promociones activas según el día actual
- 🧮 Cálculo de score: `price_level × (1 - discount)`
- 🏆 Top 3 mejores opciones

## 🏗️ Arquitectura

```
shopping-recommendation-engine/
├── backend/           # Node.js + Express + MongoDB
│   ├── config/        # Configuración de base de datos
│   ├── controllers/   # Lógica de negocio
│   ├── models/        # Schemas MongoDB
│   ├── routes/        # Endpoints API
│   └── scripts/       # Scripts de utilidad
└── frontend/          # React + Vite
    ├── src/
    │   ├── components/  # Componentes React
    │   └── services/    # API calls
```

## 🚀 Instalación

### Prerrequisitos
- Node.js 18+
- MongoDB (local o Atlas)

### 1. Clonar y entrar al proyecto

```bash
cd shopping-recommendation-engine
```

### 2. Backend

```bash
cd backend
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tu URI de MongoDB si es necesario

# Cargar datos de prueba
npm run seed

# Iniciar servidor
npm run dev
```

El backend correrá en `http://localhost:3001`

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

El frontend correrá en `http://localhost:3000`

## 📡 API Endpoints

### GET /api/best-options

Obtiene las mejores opciones de compra para una categoría.

**Query Parameters:**
- `category` (requerido): categoría de producto (carne, limpieza, bebidas, lacteos)
- `user_id` (opcional): ID del usuario para filtrar por medios de pago

**Response:**
```json
{
  "success": true,
  "day": "jueves",
  "category": "carne",
  "count": 3,
  "data": [
    {
      "store": "Chango Más",
      "discount": 0.2,
      "score": 0.76,
      "payment_method": "tarjeta_visa",
      "price_level": 2
    }
  ]
}
```

### GET /api/stores

Obtiene todas las tiendas.

### GET /api/promotions

Obtiene todas las promociones.

## 🗄️ Modelos de Datos

### Store
- `name`: Nombre de la tienda
- `categories`: Array de categorías que vende
- `price_level`: Nivel de precio (1-5)
- `location`: Coordenadas geográficas

### Promotion
- `store_id`: Referencia a la tienda
- `discount`: Descuento (0-1)
- `payment_method`: Método de pago requerido
- `days`: Días de la semana que aplica
- `active`: Si la promoción está activa
- `category`: Categoría a la que aplica

### User
- `name`: Nombre del usuario
- `email`: Email
- `payment_methods`: Métodos de pago disponibles
- `location`: Ubicación del usuario

## 🧪 Testing

```bash
# Backend
curl http://localhost:3001/api/best-options?category=carne

# O probar en el navegador:
# http://localhost:3001/api/best-options?category=limpieza
```

## 📝 Fórmula de Score

```
score = price_level × (1 - discount)
```

**Ejemplo:**
- Chango Más: price_level = 2, discount = 0.20
- Score = 2 × (1 - 0.20) = 2 × 0.80 = 1.6

**Menor score = mejor opción** (menor precio final con descuento aplicado)

## 🛣️ Roadmap

- [ ] Autenticación de usuarios
- [ ] Geolocalización para tiendas cercanas
- [ ] Favoritos y lista de compras
- [ ] Notificaciones de nuevas promociones
- [ ] Integración con APIs de supermercados reales

## 📄 Licencia

MIT
