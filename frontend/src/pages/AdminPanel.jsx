import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || ''

export default function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [token, setToken] = useState(localStorage.getItem('adminToken'))
  const [loginData, setLoginData] = useState({ email: '', password: '' })
  const [activeTab, setActiveTab] = useState('dashboard')
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [searches, setSearches] = useState([])
  const [interactions, setInteractions] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (token) {
      checkAdmin()
    }
  }, [token])

  const checkAdmin = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/admin/check`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.data.isAdmin) {
        setIsAuthenticated(true)
        setIsAdmin(true)
        loadDashboard()
      }
    } catch (err) {
      localStorage.removeItem('adminToken')
      setToken(null)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await axios.post(`${API_URL}/api/auth/login`, loginData)
      const { token } = res.data
      localStorage.setItem('adminToken', token)
      setToken(token)
      await checkAdmin()
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || err.message))
    }
    setLoading(false)
  }

  const loadDashboard = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${API_URL}/api/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setStats(res.data)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const loadUsers = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${API_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setUsers(res.data)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const loadSearches = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${API_URL}/api/admin/searches?limit=100`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setSearches(res.data)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const loadInteractions = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${API_URL}/api/admin/interactions?limit=100`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setInteractions(res.data)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (isAdmin) {
      if (activeTab === 'dashboard') loadDashboard()
      if (activeTab === 'users') loadUsers()
      if (activeTab === 'searches') loadSearches()
      if (activeTab === 'interactions') loadInteractions()
    }
  }, [activeTab, isAdmin])

  const handleLogout = () => {
    localStorage.removeItem('adminToken')
    setToken(null)
    setIsAuthenticated(false)
    setIsAdmin(false)
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0f2e]">
        <form onSubmit={handleLogin} className="bg-white/10 p-8 rounded-2xl border border-white/20 w-full max-w-md">
          <h1 className="text-2xl font-bold text-white mb-6 text-center">Panel de Admin</h1>
          <div className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={loginData.email}
              onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50"
              required
            />
            <input
              type="password"
              placeholder="Contraseña"
              value={loginData.password}
              onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-orange-500 hover:bg-orange-400 text-white font-semibold rounded-lg transition-colors"
            >
              {loading ? 'Cargando...' : 'Ingresar'}
            </button>
          </div>
          <p className="text-white/50 text-sm mt-4 text-center">
            Default: admin@mejoria.com / admin123
          </p>
        </form>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0f2e] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0a0f2e]/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">MejorIA Admin</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
          >
            Salir
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
        {/* Sidebar */}
        <aside className="w-64 shrink-0">
          <nav className="space-y-2">
            {[
              { id: 'dashboard', label: 'Dashboard' },
              { id: 'users', label: 'Usuarios' },
              { id: 'searches', label: 'Búsquedas' },
              { id: 'interactions', label: 'Interacciones' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-orange-500 text-white'
                    : 'bg-white/5 hover:bg-white/10 text-white/80'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1">
          {loading && <div className="text-white/60">Cargando...</div>}

          {activeTab === 'dashboard' && stats && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Dashboard</h2>
              
              {/* Stats Cards */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-white/10 p-6 rounded-xl">
                  <p className="text-white/60 text-sm">Usuarios</p>
                  <p className="text-3xl font-bold">{stats.stats.total_users}</p>
                </div>
                <div className="bg-white/10 p-6 rounded-xl">
                  <p className="text-white/60 text-sm">Búsquedas</p>
                  <p className="text-3xl font-bold">{stats.stats.total_searches}</p>
                </div>
                <div className="bg-white/10 p-6 rounded-xl">
                  <p className="text-white/60 text-sm">Clicks</p>
                  <p className="text-3xl font-bold">{stats.stats.total_clicks}</p>
                </div>
                <div className="bg-white/10 p-6 rounded-xl">
                  <p className="text-white/60 text-sm">Views</p>
                  <p className="text-3xl font-bold">{stats.stats.total_views}</p>
                </div>
              </div>

              {/* Popular Searches */}
              <div className="bg-white/10 p-6 rounded-xl">
                <h3 className="text-lg font-semibold mb-4">Búsquedas Populares</h3>
                <div className="space-y-2">
                  {stats.popular_searches?.map((s, i) => (
                    <div key={i} className="flex justify-between py-2 border-b border-white/10">
                      <span>{s.query}</span>
                      <span className="text-white/60">{s.count} veces</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Usuarios</h2>
              <div className="bg-white/10 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="text-left px-4 py-3">Nombre</th>
                      <th className="text-left px-4 py-3">Email</th>
                      <th className="text-left px-4 py-3">Rol</th>
                      <th className="text-left px-4 py-3">Registro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-t border-white/10">
                        <td className="px-4 py-3">{u.name}</td>
                        <td className="px-4 py-3">{u.email}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs ${
                            u.role === 'admin' ? 'bg-orange-500' : 'bg-white/20'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-white/60">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'searches' && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Búsquedas Recientes</h2>
              <div className="space-y-2">
                {searches.map((s) => (
                  <div key={s.id} className="bg-white/10 p-4 rounded-xl">
                    <div className="flex justify-between">
                      <span className="font-medium">{s.query}</span>
                      <span className="text-white/60 text-sm">
                        {new Date(s.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-white/60 text-sm mt-1">
                      Usuario: {s.user_name || 'Anónimo'} | Resultados: {s.results_count}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'interactions' && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Interacciones</h2>
              <div className="space-y-2">
                {interactions.map((i) => (
                  <div key={i.id} className="bg-white/10 p-4 rounded-xl">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className={`px-2 py-1 rounded text-xs ${
                          i.action === 'click' ? 'bg-green-500' :
                          i.action === 'save' ? 'bg-blue-500' : 'bg-white/20'
                        }`}>
                          {i.action}
                        </span>
                        <p className="mt-2 font-medium">{i.product_title?.substring(0, 60)}...</p>
                        <p className="text-white/60 text-sm">${i.product_price} - {i.product_store}</p>
                      </div>
                      <span className="text-white/60 text-sm">
                        {new Date(i.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}