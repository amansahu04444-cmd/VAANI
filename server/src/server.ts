import { app } from './app.js'
import { config } from './config/env.js'

app.listen(config.PORT, () => {
  console.log(`[VAANI Server] Listening securely on port ${config.PORT} (env: ${config.NODE_ENV})`)
})

