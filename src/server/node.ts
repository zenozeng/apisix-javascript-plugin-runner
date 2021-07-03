import * as net from 'net'
import * as fs from 'fs'
import RPCServer from './rpc'
import Runner from '../runner'

const HEADER_LEN = 4
const sockAddr = process.env.APISIX_LISTEN_ADDRESS.replace(/^unix:/, '')
const runner = new Runner()
const rpcServer = new RPCServer(runner)
const args = process.argv.slice(2)
console.log(`JavaScript Plugin Runner Listening on ${sockAddr}`)
args.forEach((path) => {
    try {
        const plugin = new (require(path) as any)()
        runner.registerPlugin(plugin)
    } catch (e) {
        console.error(e)
    }
})

const server = net.createServer((conn) => {
    console.log(`Client connected`)
    let receivedBytes = 0
    let dataLength: number = null
    let ty: number = null
    let buf = Buffer.alloc(0)
    let done = false
    conn.on('data', async (d: Buffer) => {
        if (done) {
            return
        }
        if (dataLength === null) {
            buf = Buffer.concat([buf, d])
        } else {
            d.copy(buf, receivedBytes)
        }
        receivedBytes += d.length
        if (dataLength === null) {
            if (receivedBytes >= HEADER_LEN) {
                ty = buf[0]
                dataLength = Buffer.from([0, buf[1], buf[2], buf[3]]).readInt32BE()
                const new_buf = Buffer.alloc(dataLength)
                buf.copy(new_buf, 0, HEADER_LEN)
                buf = new_buf
                console.log(`Header parsed: `, {ty, dataLength})
            }
        }
        if (dataLength !== null && receivedBytes >= HEADER_LEN + dataLength) {
            done = true
            const bytes = await rpcServer.dispatch(ty, buf)
            const respSize = bytes.length
            const header = Buffer.alloc(HEADER_LEN)
            header.writeUInt32BE(respSize, 0)
            header[0] = ty
            conn.write(header)
            conn.write(bytes, (err) => {
                console.error(err)
            })
        }
    })

    conn.on('end', () => {
        console.log(`conn end`)
    })

    conn.on('error', (err) => {
        console.error(err)
    })
})

server.listen(sockAddr, () => {
    fs.chmodSync(sockAddr, 0o777)
})

process.on('beforeExit', () => {
    // clean up sock file
    server.close()
});
  