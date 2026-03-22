import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import OrthoApp from './OrthoApp'
import './styles/tokens.css'
import './index.css'

const path = window.location.pathname
const Root = path === '/orthopedics' ? OrthoApp : App

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)
