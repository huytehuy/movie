import MyComponent from './components/axios'
import {Route, Routes } from 'react-router-dom'
import DetailMovie from './components/DetailMovie'
import SearchData from './components/searchMovie'
import SportComponnet from './components/Sport'
import SportDetail from './components/SportDetail'
import PhimLe from './components/phimLe'

function Router() {
  return (
    <Routes>
      <Route path="/" element={<MyComponent/>} />
      <Route path="/phim_le" element={<PhimLe />} />
      <Route path="/phim_bo" element={<PhimLe />} />
      <Route path="/phim_chieu_rap" element={<PhimLe />} />
      <Route path="/detail/:id" element={<DetailMovie />} />
      <Route path="/search/:id" element={<SearchData/>} />
      <Route path="/sport" element={<SportComponnet/>} />
      <Route path="/sportDetail/:id" element={<SportDetail/>} />
    </Routes>
  )
}

export default Router
