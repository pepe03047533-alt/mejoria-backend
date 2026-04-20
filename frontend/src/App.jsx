import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Results from './pages/Results'
import AdminPanel from './pages/AdminPanel'
import MLBest from './pages/MLBest'
import AuthCallback from './pages/AuthCallback'
import UserProfile from './pages/UserProfile'
import Promotions from './pages/Promotions'

function App() {
  return (
    <div className="min-h-screen bg-hero">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/results" element={<Results />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/ml-best" element={<MLBest />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/profile" element={<UserProfile />} />
      </Routes>
    </div>
  )
}

export default App
