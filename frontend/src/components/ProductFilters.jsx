import { useState, useEffect } from 'react'

const UBICACIONES = [
  'Todo el país',
  'CABA',
  'Gran Buenos Aires',
  'Córdoba',
  'Rosario',
  'Pilar',
  'Santa Fe',
]

const TIEMPOS_ENTREGA = [
  { value: 'all', label: 'Cualquier tiempo' },
  { value: '24', label: '24 horas' },
  { value: '48', label: '48 horas' },
  { value: '72', label: '72 horas' },
]

const ALCANCE_OPTIONS = [
  { value: 'all', label: 'Todas las opciones' },
  { value: 'regional', label: 'Solo Argentina 🇦🇷' },
  { value: 'internacional', label: 'Internacional con impuestos 🌎' },
]

export default function ProductFilters({ products, onFilterChange }) {
  const [condicion, setCondicion] = useState('all')
  const [ubicacion, setUbicacion] = useState('Todo el país')
  const [tiempoEntrega, setTiempoEntrega] = useState('all')
  const [alcance, setAlcance] = useState('all')
  const [precioMax, setPrecioMax] = useState(0)
  const [tiendas, setTiendas] = useState([])
  const [tiendaSeleccionada, setTiendaSeleccionada] = useState('all')

  // Extraer tiendas únicas de los productos
  useEffect(() => {
    const uniqueTiendas = [...new Set(products.map(p => p.tienda))].sort()
    setTiendas(uniqueTiendas)
    
    // Calcular precio máximo para el slider
    const max = products.length > 0 ? Math.max(...products.map(p => p.precio)) : 0
    setPrecioMax(max)
  }, [products])

  // Aplicar filtros cuando cambian
  useEffect(() => {
    let filtered = [...products]

    // Filtro por condición
    if (condicion !== 'all') {
      filtered = filtered.filter(p => 
        condicion === 'nuevo' ? p.condicion === 'Nuevo' : p.condicion === 'Usado'
      )
    }

    // Filtro por ubicación
    if (ubicacion !== 'Todo el país') {
      filtered = filtered.filter(p => {
        if (!p.ubicacion) return true
        return p.ubicacion.toLowerCase().includes(ubicacion.toLowerCase())
      })
    }

    // Filtro por tiempo de entrega
    if (tiempoEntrega !== 'all') {
      filtered = filtered.filter(p => {
        if (!p.tiempoEntrega) return true
        const horas = parseInt(p.tiempoEntrega.match(/\d+/)?.[0] || '999')
        return horas <= parseInt(tiempoEntrega)
      })
    }

    // Filtro por alcance geográfico
    if (alcance !== 'all') {
      filtered = filtered.filter(p => {
        const prodAlcance = p.alcance || 'regional'
        return prodAlcance === alcance
      })
    }

    // Filtro por tienda
    if (tiendaSeleccionada !== 'all') {
      filtered = filtered.filter(p => p.tienda === tiendaSeleccionada)
    }

    onFilterChange(filtered)
  }, [condicion, ubicacion, tiempoEntrega, alcance, tiendaSeleccionada, products, onFilterChange])

  if (products.length === 0) return null

  // Contar productos por alcance
  const countRegional = products.filter(p => (p.alcance || 'regional') === 'regional').length
  const countInternacional = products.filter(p => p.alcance === 'internacional').length

  return (
    <div className="mb-6 p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
      <div className="flex flex-wrap gap-4 items-end">
        
        {/* Alcance geográfico */}
        <div className="flex flex-col gap-1">
          <label className="text-white/50 text-xs uppercase tracking-wider">Origen</label>
          <select 
            value={alcance}
            onChange={(e) => setAlcance(e.target.value)}
            className="px-3 py-2 rounded-lg bg-black/30 border border-white/20 text-white text-sm focus:border-cyan-400 focus:outline-none min-w-[180px]"
          >
            <option value="all">Todas ({products.length})</option>
            <option value="regional">🇦🇷 Argentina ({countRegional})</option>
            {countInternacional > 0 && (
              <option value="internacional">🌎 Internacional ({countInternacional})</option>
            )}
          </select>
        </div>

        {/* Condición */}
        <div className="flex flex-col gap-1">
          <label className="text-white/50 text-xs uppercase tracking-wider">Condición</label>
          <select 
            value={condicion}
            onChange={(e) => setCondicion(e.target.value)}
            className="px-3 py-2 rounded-lg bg-black/30 border border-white/20 text-white text-sm focus:border-cyan-400 focus:outline-none"
          >
            <option value="all">Todas</option>
            <option value="nuevo">Nuevo</option>
            <option value="usado">Usado</option>
          </select>
        </div>

        {/* Ubicación */}
        <div className="flex flex-col gap-1">
          <label className="text-white/50 text-xs uppercase tracking-wider">Ubicación</label>
          <select 
            value={ubicacion}
            onChange={(e) => setUbicacion(e.target.value)}
            className="px-3 py-2 rounded-lg bg-black/30 border border-white/20 text-white text-sm focus:border-cyan-400 focus:outline-none"
          >
            {UBICACIONES.map(u => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>

        {/* Tiempo de entrega */}
        <div className="flex flex-col gap-1">
          <label className="text-white/50 text-xs uppercase tracking-wider">Entrega máx.</label>
          <select 
            value={tiempoEntrega}
            onChange={(e) => setTiempoEntrega(e.target.value)}
            className="px-3 py-2 rounded-lg bg-black/30 border border-white/20 text-white text-sm focus:border-cyan-400 focus:outline-none"
          >
            {TIEMPOS_ENTREGA.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Tienda */}
        <div className="flex flex-col gap-1">
          <label className="text-white/50 text-xs uppercase tracking-wider">Tienda</label>
          <select 
            value={tiendaSeleccionada}
            onChange={(e) => setTiendaSeleccionada(e.target.value)}
            className="px-3 py-2 rounded-lg bg-black/30 border border-white/20 text-white text-sm focus:border-cyan-400 focus:outline-none"
          >
            <option value="all">Todas las tiendas</option>
            {tiendas.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Contador de resultados */}
        <div className="ml-auto text-white/40 text-sm">
          {products.length} producto{products.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Info de impuestos para internacional */}
      {alcance === 'internacional' && countInternacional > 0 && (
        <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
          <p className="text-yellow-200 text-xs">
            ⚠️ Los precios internacionales incluyen: 35% Impuesto PAIS + 30% Derechos de importación + 21% IVA = 
            <strong>~86% de recargo total</strong>. El precio mostrado es el final que pagarías en Argentina.
          </p>
        </div>
      )}
    </div>
  )
}
