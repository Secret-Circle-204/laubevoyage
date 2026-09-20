import { PHASE_PRODUCTION_BUILD } from 'next/constants'

export async function register() {
  if (
    process.env.NEXT_RUNTIME === 'nodejs' &&
    process.env.NEXT_PHASE !== PHASE_PRODUCTION_BUILD
  ) {
    await import('./lib/env')

    const { getDomainServices } = await import('./domains/factory')
    const { bootstrapApplication, bootstrapWorkerApplication } = await import('./domains/bootstrap')
    const container = await getDomainServices()

    if (process.env.DISABLE_BG_WORKERS === 'true') {
      console.log('[SystemBootstrap] Web-only runtime detected. Bootstrapping web application.')
      await bootstrapApplication(container)
    } else {
      console.log('[SystemBootstrap] Unified runtime detected. Bootstrapping web & background workers.')
      await bootstrapWorkerApplication(container)
    }
  }
}
