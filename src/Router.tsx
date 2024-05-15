import MyComponent from './components/axios'
import { BrowserRouter, Route, Routes} from 'react-router-dom'
import FilmComponent from './components/artplayer'
import AppShellMain from './components/Appshell'
import DetailMovie from './components/DetailMovie'

function Router() {
  return (
    <BrowserRouter>
    <Routes>
      <Route path="/" element={<MyComponent />} />
      {/* <Route path="/detail" element={<FilmComponent />} /> */}
      <Route path="/detail/:id" element={<DetailMovie/>} />
    </Routes>
  </BrowserRouter>
  )
}

export default Router
