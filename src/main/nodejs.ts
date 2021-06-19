import * as net from 'net'

const server = net.createServer()
server.listen(process.env.APISIX_LISTEN_ADDRESS)
