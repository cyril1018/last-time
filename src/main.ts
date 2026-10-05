import './app.css'
import { mount } from 'svelte'
import App from './App.svelte'
import { store } from './lib/app-store'
import { router } from './lib/router.svelte'
import { sheets } from './lib/sheet.svelte'
import { registerSW } from 'virtual:pwa-register'

router.start()
sheets.start()
store.init().catch((e: unknown) => {
  // IndexedDB failed to open (private mode, storage blocked, corrupt profile): say so instead of a blank page.
  console.error(e)
  const msg = document.createElement('p')
  msg.className = 'fatal'
  msg.setAttribute('role', 'alert')
  msg.textContent = '無法開啟資料庫，請重新整理；若持續發生，請清除網站資料前先確認已有備份。'
  document.body.append(msg)
})
if (navigator.storage?.persist) void navigator.storage.persist()

registerSW({ immediate: true })

mount(App, { target: document.getElementById('app')! })
