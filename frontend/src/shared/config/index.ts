// frontend/src/shared/config/index.ts


import { config } from '@fortawesome/fontawesome-svg-core'
import '@fortawesome/fontawesome-svg-core/styles.css'

// Prevent Font Awesome from dynamically adding its own CSS 
config.autoAddCss = false

// === Exports === /
export * from "./routes"
export * from "./connection-tabs"
