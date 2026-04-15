require('dotenv').config();
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');

// Conexión a MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("🚀 Conectado a MongoDB Atlas"))
  .catch(err => console.error("❌ Error de conexión:", err));

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// RUTA DE SALUD (La que confirmará que todo está OK)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'MejorIA Backend', 
    database: 'MongoDB Atlas',
    message: 'Sistema operando correctamente'
  });
});

// Ruta raíz para evitar el error 404
app.get('/', (req, res) => {
  res.send('Servidor de MejorIA activo y conectado a MongoDB Atlas.');
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor en puerto ${PORT}`);
});
