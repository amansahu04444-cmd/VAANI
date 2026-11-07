import { app } from './app.js'
import { config, validateSupabaseConfig } from './config/env.js'
import { checkSupabaseHealth } from './db/supabase.js'

app.listen(config.PORT, '0.0.0.0', async () => {
  const sbConf = validateSupabaseConfig()
  console.log(`[VAANI Server] Listening securely on 0.0.0.0:${config.PORT} (env: ${config.NODE_ENV})`)
  console.log(`[VAANI Server] Supabase Host: ${sbConf.urlHost} (anonKey: ${sbConf.hasAnonKey}, serviceRole: ${sbConf.hasServiceRoleKey})`)

  try {
    const health = await checkSupabaseHealth()
    console.log(`[VAANI Server] Supabase Connection: ${health.status.toUpperCase()} (DB: ${health.database}, Storage: ${health.storage}, Latency: ${health.latencyMs}ms)`)
  } catch (err: any) {
    console.warn(`[VAANI Server] Supabase startup probe warning: ${err.message}`)
  }
})

