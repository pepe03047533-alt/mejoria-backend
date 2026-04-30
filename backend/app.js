const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();
app.use(cors());
app.use(express.json());
const normalizarPrecio = (nombre, precio) => {
    const regex = /([0-9]+(?:[.,][0-9]{1,3})?) ?(l|lt|cc|ml|k|kg|g|gr|u|un)/i;
    const match = nombre.match(regex);
    if (match) {
        let valor = parseFloat(match[1].replace(',', '.'));
        let unidad = match[2].toLowerCase();
        let factor = (['cc', 'ml', 'g', 'gr'].includes(unidad)) ? valor / 1000 : valor;
        return (precio / factor).toFixed(2);
    }
    return precio;
};
// BUSCADOR REAL DE CARREFOUR
app.get('/api/buscar', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: "Escribí un producto" });

    try {
        const url = `https://www.carrefour.com.ar/api/catalog_system/pub/products/search/${encodeURIComponent(query)}`;
        const response = await axios.get(url);
        
        const resultados = response.data.map(p => {
            const precioTotal = p.items[0].sellers[0].commertialOffer.Price;
            const nombre = p.productName;
            
            return {
                nombre: nombre,
                precio: precioTotal,
                precioComparativo: normalizarPrecio(nombre, precioTotal),
                supermercado: "Carrefour",
                link: p.link,
                imagen: p.items[0].images[0].imageUrl
            };
        });

        resultados.sort((a, b) => a.precioComparativo - b.precioComparativo);
        res.json(resultados);
    } catch (error) {
        res.status(500).json({ error: "Error en el motor" });
    }
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Motor de Mejoría funcionando en puerto ${PORT}`);
});