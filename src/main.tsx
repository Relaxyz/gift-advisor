import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// 尝试加载自定义背景图，依次检测 jpg / png / webp
const bgExts = ['jpg', 'png', 'webp']
function tryBg(i: number) {
  if (i >= bgExts.length) return
  const img = new Image()
  img.onload = () => {
    document.body.classList.add('has-custom-bg')
    document.documentElement.style.setProperty('--bg-url', `url(/bg.${bgExts[i]})`)
  }
  img.onerror = () => tryBg(i + 1)
  img.src = `/bg.${bgExts[i]}`
}
tryBg(0)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
