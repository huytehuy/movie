import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './App.css'
import { MantineProvider } from '@mantine/core'
import { BrowserRouter } from 'react-router-dom'
import { UserProvider } from './context/UserContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MantineProvider >
      <BrowserRouter>
      <UserProvider>
        <App />
      </UserProvider>
      </BrowserRouter>
    </MantineProvider>
  </React.StrictMode>,
)
