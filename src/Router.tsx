import MyComponent from './components/axios'
import { Navigate, Route, Routes } from 'react-router-dom'
import DetailMovie from './components/DetailMovie'
import SearchData from './components/searchMovie'
import SportComponnet from './components/Sport'
import SportDetail from './components/SportDetail'

function Router() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/phim_dang_hot" replace />} />
      <Route path="/phim_le" element={<MyComponent />} />
      <Route path="/phim_bo" element={<MyComponent />} />
      <Route path="/phim_moi" element={<MyComponent />} />
      <Route path="/phim_dang_hot" element={<MyComponent />} />
      <Route path="/detail/:id" element={<DetailMovie />} />
      <Route path="/search/:id" element={<SearchData/>} />
      <Route path="/sport" element={<SportComponnet/>} />
      <Route path="/sportDetail/:id" element={<SportDetail/>} />
    </Routes>
  )
}

export default Router
