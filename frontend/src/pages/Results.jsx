import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import SearchBar from '../components/SearchBar'
import ProductCard from '../components/ProductCard'
import Loader from '../components/Loader'
import { searchProducts } from '../services/api'

export default function Results() {
    const [searchParams] = useSearchParams()
    const query = searchParams.get('q') || ''
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [renderTime, setRenderTime] = useState(null)

    useEffect(() => {
        // Solo buscamos si hay una query y NO estamos cargando ya
        const fetchResults = async () => {
            if (!query) return;
            
            setLoading(true);
            setError(null);
            
            try {
                const response = await searchProducts(query);
                const data = response?.products || response?.results || [];
                setProducts(data);
                setRenderTime(Date.now());
            } catch (err) {
                console.error("Error en búsqueda:", err);
                if (err.response?.status === 404) {
                    setProducts([]);
                    setError(err.response.data.error || "Sin resultados.");
                } else {
                    setError("Error de conexión con el motor.");
                }
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    }, [query]); // IMPORTANTE: Solo se dispara cuando cambia la palabra buscada

    return (
        <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#0b1120] text-white">
            {/* 1. La barra va afuera del contenido de resultados para evitar bucles */}
            <div className="w-full max-w-full border-b border-white/5 px-4 py-5 sm:p-6">
                <SearchBar initialValue={query} />
            </div>
            
            <main className="w-full max-w-7xl mx-auto px-4 py-5 sm:p-6">
                {loading && (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader />
                        <p className="mt-4 text-gray-400 animate-pulse">Buscando las mejores ofertas para "{query}"...</p>
                    </div>
                )}
                
                {error && !loading && (
                    <div className="text-center px-4 py-8 sm:p-10 bg-red-500/10 border border-red-500/20 rounded-2xl">
                        <p className="text-red-400 font-medium">{error}</p>
                    </div>
                )}
                
                {!loading && !error && products.length > 0 && (
                    <>
                        <div className="mb-5 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-200">
                            Mostrando {products.length} opciones del producto que pediste, ordenadas por precio (menor a mayor).
                            La primera es la más barata entre las que pasaron el filtro y está marcada como <span className="font-semibold">Mejor precio</span>.
                        </div>
                        <div className="grid w-full min-w-0 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                            {products.map((item, index) => (
                                <ProductCard 
                                    key={`${item.id || index}`}
                                    product={item}
                                    rank={index + 1}
                                    query={query}
                                    renderTime={renderTime}
                                    isBestPrice={index === 0}
                                />
                            ))}
                        </div>
                    </>
                )}

                {!loading && !error && products.length === 0 && query && (
                    <div className="text-center py-20">
                        <p className="text-gray-400">No encontramos nada para "{query}". Intentá con otros términos.</p>
                    </div>
                )}
            </main>
        </div>
    )
}