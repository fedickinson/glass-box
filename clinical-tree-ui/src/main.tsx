import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import OrthoApp, { OrthoReasoningApp } from './OrthoApp'
import './styles/tokens.css'
import './index.css'
import faviconUrl from './assets/logo-transparent.png'
import fullLogoUrl from './assets/full-logo-transparent.png'

function setFavicon(href: string) {
  let link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  link.href = href
}

setFavicon(faviconUrl)

const path = window.location.pathname

if (path === '/orthopedics/reasoning') {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <OrthoReasoningApp />
    </React.StrictMode>,
  )
} else if (path === '/orthopedics') {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <OrthoApp />
    </React.StrictMode>,
  )
} else {
  document.getElementById('root')!.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#f8f9fb;font-family:system-ui,sans-serif;">
      <div style="text-align:center;color:#555;">
        <img src="${fullLogoUrl}" alt="Clinical Reasoning Tree" style="display:block;margin:0 auto; max-width:455px;" />

        <div style="font-size:22px;font-weight:500;color:#111;margin-bottom:8px;">Demo is at <a href="/orthopedics" style="color:#1A52A8;text-decoration:none;">/orthopedics</a></div>
        <div style="font-size:13px;color:#888;">Navigate to <a href="/orthopedics" style="color:#1A52A8;">/orthopedics</a> for the full view, or <a href="/orthopedics/reasoning" style="color:#1A52A8;">/orthopedics/reasoning</a> for the cinematic generation flow.</div>
      </div>
    </div>
  `
}
