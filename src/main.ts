import './app.css'
import { mount } from 'svelte'
import App from './App.svelte'
import { store } from './lib/app-store'
import { router } from './lib/router.svelte'
import { sheets } from './lib/sheet.svelte'

router.start()
sheets.start()
void store.init()
if (navigator.storage?.persist) void navigator.storage.persist()

mount(App, { target: document.getElementById('app')! })
