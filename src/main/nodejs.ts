import * as net from 'net'

const sockAddr = process.env.APISIX_LISTEN_ADDRESS.replace(/^unix:/, '')
console.log(`JavaScript Plugin Runner Listening on ${sockAddr}`)

const server = net.createServer((conn) => {
    console.log(`Client connected: ${conn.remoteAddress}`)
})

server.listen(sockAddr)

process.on('beforeExit', () => {
    // clean up sock file
    server.close()
});
  