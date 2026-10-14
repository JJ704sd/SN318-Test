import { createApp } from './app.js'
import { loadConfig } from './env.js'
import { createLocalDevApp } from './local-dev.js'

const localDevelopment = process.env.BFF_AUTH_MODE === 'local-dev'
const config = localDevelopment
  ? { host: process.env.BFF_HOST ?? '127.0.0.1', port: Number(process.env.BFF_PORT ?? 8180) }
  : loadConfig()
const app = localDevelopment
  ? createLocalDevApp({
      environment: process.env.APP_ENV ?? '',
      ...(process.env.NODE_ENV === undefined ? {} : { nodeEnvironment: process.env.NODE_ENV }),
      host: config.host,
      lmdServiceBaseUrl: process.env.LMD_SERVICE_BASE_URL ?? 'http://127.0.0.1:8082',
      pcsServiceBaseUrl: process.env.PCS_SERVICE_BASE_URL ?? 'http://127.0.0.1:8080',
    })
  : createApp(loadConfig())

app
  .listen({ port: config.port, host: config.host })
  .then((address) => {
    app.log.info(`pcs-front BFF listening at ${address}`)
  })
  .catch((err: unknown) => {
    app.log.error(err)
    process.exit(1)
  })
