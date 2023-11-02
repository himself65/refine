import { createApp } from './server.js'

const { server } = createApp()

server.listen(process.env.PORT || 3030)
