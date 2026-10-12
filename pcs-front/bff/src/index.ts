import { createApp } from './app.js'
import { loadConfig } from './env.js'

const config = loadConfig()
const app = createApp(config)

app
  .listen({ port: config.port, host: config.host })
  .then((address) => {
    app.log.info(`pcs-front BFF listening at ${address}`)
  })
  .catch((err: unknown) => {
    app.log.error(err)
    process.exit(1)
  })
