import * as net from 'net'
import * as fs from 'fs'

const sockAddr = process.env.APISIX_LISTEN_ADDRESS.replace(/^unix:/, '')
console.log(`JavaScript Plugin Runner Listening on ${sockAddr}`)

const server = net.createServer((conn) => {
    console.log(`Client connected: ${conn.remoteAddress}`)
})

server.listen(sockAddr, () => {
    fs.chmodSync(sockAddr, 0o777)
})

process.on('beforeExit', () => {
    // clean up sock file
    server.close()
});
  