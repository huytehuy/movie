import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './App.css'
import { createTheme, MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'

const theme = createTheme({
  primaryColor: 'indigo',
  defaultRadius: 'md',
})

// iOS đôi khi vẫn cho pinch zoom dù đã có user-scalable=no — chặn nốt bằng JS
document.addEventListener('gesturestart', (e) => e.preventDefault())

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <MantineProvider theme={theme} defaultColorScheme="dark">
        <Notifications position="top-right" />
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </MantineProvider>
    </HelmetProvider>
  </React.StrictMode>,
)
