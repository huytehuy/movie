import Home from './components/home'
import { Route, Routes } from 'react-router-dom'
import DetailMovie from './components/DetailMovie'
import SearchResults from './components/SearchResults'
import MovieList from './components/MovieList'
import NotFound from './components/NotFound'
import History from './pages/History'
import WatchPartyTest from './WatchPartyTest'

function Router() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/phim_le" element={<MovieList />} />
      <Route path="/phim_bo" element={<MovieList />} />
      <Route path="/phim_dang_chieu" element={<MovieList />} />
      <Route path="/phim_moi_cap_nhat" element={<MovieList />} />
      <Route path="/the-loai/:slug" element={<MovieList />} />
      <Route path="/quoc-gia/:slug" element={<MovieList />} />
      <Route path="/nam/:slug" element={<MovieList />} />
      <Route path="/detail/:id" element={<DetailMovie />} />
      <Route path="/detail/:slug@:id" element={<DetailMovie />} />
      <Route path="/search/:id" element={<SearchResults />} />
      <Route path="/history" element={<History />} />
      <Route path="/watch-party" element={<WatchPartyTest />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default Router
