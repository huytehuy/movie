import MyComponent from './components/home'
import { Route, Routes } from 'react-router-dom'
import DetailMovie from './components/DetailMovie'
import SearchData from './components/searchMovie'
// import SportComponnet from './components/Sport'
// import SportDetail from './components/SportDetail'
import PhimLe from './components/phimLe'
import NotFound from './components/NotFound'
import History from './pages/History'
import WatchPartyTest from './WatchPartyTest'

function Router() {
  return (
    <Routes>
      <Route path="/" element={<MyComponent />} />
      <Route path="/phim_le" element={<PhimLe />} />
      <Route path="/phim_bo" element={<PhimLe />} />
      <Route path="/phim_dang_chieu" element={<PhimLe />} />
      <Route path="/detail/:id" element={<DetailMovie />} />
      <Route path="/detail/:slug@:id" element={<DetailMovie />} />
      <Route path="/search/:id" element={<SearchData />} />
      <Route path="/history" element={<History />} />
      <Route path="/watch-party-test" element={<WatchPartyTest />} />
      <Route path="*" element={<NotFound />} />

      {/* <Route path="/sport" element={<SportComponnet/>} />
      <Route path="/sportDetail/:id" element={<SportDetail/>} /> */}
    </Routes>
  )
}

export default Router
