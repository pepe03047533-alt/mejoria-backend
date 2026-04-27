const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

router.post('/', async (req, res) => {
  const { query, products, message, history } = req.body;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return res.json({
      response: 'El asistente IA no está configurado. Agregá tu GEMINI_API_KEY en el archivo .env para activarlo.'
    });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    let prompt;
    if (products && products.length > 0) {
      // Analysis of search results
      const productosTexto = products.map((p, i) =>
        `${i + 1}. ${p.titulo} | Tienda: ${p.tienda} | Precio: $${p.precio.toLocaleString('es-AR')} ARS | Descuento: ${p.descuento}%`
      ).join('\n');

      prompt = `Sos MejorIA, un asistente de compras inteligente para Argentina. Hablás en español rioplatense, sos amigable y directo.

El usuario buscó: "${query}"
Encontramos estos ${products.length} productos destacados del e-commerce argentino (MercadoLibre, Frávega, Carrefour, Cetrogar, Coto Digital y más):

${productosTexto}

Analizá los resultados y respondé en máximo 5 oraciones:
- Mencioná cuál es el más barato
- Cuál tiene el mayor descuento o mejor oferta
- Si hay diferencias importantes de precio entre tiendas
- Una recomendación final según precio/calidad

No uses listas con guiones, escribí en párrafos naturales y fluidos.`;
    } else if (message) {
      // Free chat with history
      const historyText = (history || []).map(h => `${h.role === 'user' ? 'Usuario' : 'MejorIA'}: ${h.content}`).join('\n');
      prompt = `Sos MejorIA, asistente de compras para Argentina. Hablás en español rioplatense. Ayudás a encontrar productos con los mejores precios y ofertas en sitios como MercadoLibre, Frávega y Garbarino.

${historyText ? `Conversación previa:\n${historyText}\n\n` : ''}Usuario: ${message}
MejorIA:`;
    } else {
      return res.status(400).json({ error: 'Datos insuficientes para el asistente' });
    }

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    res.json({ response });
  } catch (error) {
    console.error('Error Gemini:', error.message);
    res.status(500).json({ error: 'Error al consultar el asistente IA.' });
  }
});

module.exports = router;
