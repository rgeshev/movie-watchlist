import 'bootstrap/dist/css/bootstrap.min.css'
import * as bootstrap from 'bootstrap'
import './style.css'
import { initApp } from './app.js'

window.bootstrap = bootstrap

initApp().catch(console.error)
