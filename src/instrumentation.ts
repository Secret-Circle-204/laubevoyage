import { PHASE_PRODUCTION_BUILD } from 'next/constants'

export async function register() {
  if (
    process.env.NEXT_RUNTIME === 'nodejs' &&
    process.env.NEXT_PHASE !== PHASE_PRODUCTION_BUILD
  ) {
    const { bootstrapWebApplication, bootstrapWorkerApplication } = await import('./domains/bootstrap')
    
    if (process.env.DISABLE_BG_WORKERS === 'true') {
      console.log('[SystemBootstrap] Web-only runtime detected. Bootstrapping web application.')
      await bootstrapWebApplication()
    } else {
      console.log('[SystemBootstrap] Unified runtime detected. Bootstrapping web & background workers.')
      await bootstrapWorkerApplication()
    }
  }
}
