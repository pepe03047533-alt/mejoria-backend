export default function Loader() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-6">
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full border-4 border-cyan-400/20 animate-ping"></div>
        <div className="absolute inset-2 rounded-full border-4 border-t-cyan-400 border-r-orange-400 border-b-cyan-400/20 border-l-orange-400/20 animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <img src="/logo.png" alt="MejorIA" className="w-10 h-10 rounded-full object-cover" />
        </div>
      </div>
      <div className="text-center">
        <p className="text-white font-semibold text-lg">Buscando las mejores ofertas...</p>
        <p className="text-white/50 text-sm mt-1">Consultando MercadoLibre, Frávega, Garbarino y más</p>
      </div>
    </div>
  )
}
