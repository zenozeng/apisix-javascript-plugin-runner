// Licensed to the Apache Software Foundation (ASF) under one or more
// contributor license agreements.  See the NOTICE file distributed with
// this work for additional information regarding copyright ownership.
// The ASF licenses this file to You under the Apache License, Version 2.0
// (the "License"); you may not use this file except in compliance with
// the License.  You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as net from 'net'
import * as fs from 'fs'
import RPCServer from './rpc'
import Runner from '../runner'
import Logger from '../util/logger'

const HEADER_LEN = 4
const sockAddr = process.env.APISIX_LISTEN_ADDRESS.replace(/^unix:/, '')
const runner = new Runner()
const rpcServer = new RPCServer(runner)
const args = process.argv.slice(2)
const logger = new Logger()
logger.log(`JavaScript Plugin Runner Listening on ${sockAddr}`)
args.forEach((path) => {
    try {
        const plugin = new (require(path) as any)()
        runner.registerPlugin(plugin)
    } catch (e) {
        console.error(e)
    }
})

let connCount = -1
const server = net.createServer((conn) => {
    logger.debug(`Client connected`)
    let receivedBytes = 0
    let dataLength: number = null
    let ty: number = null
    let buf = Buffer.alloc(0)
    let done = false
    connCount++
    let connId = connCount
    conn.on('data', async (d: Buffer) => {
        logger.debug(`Conn#${connId}: receive data: ${d.length} bytes`)
        if (done) {
            // new data package received, reinit
            receivedBytes = 0
            dataLength = null
            ty = null
            buf = Buffer.alloc(0)
            done = false
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
                logger.debug(`Conn#${connId} rpc header: `, {ty, dataLength})
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

    conn.on('close', () => {
        console.debug(`Connection closed`)
    })

    conn.on('error', (err) => {
        console.error(err)
    })
})

server.listen(sockAddr, () => {
    fs.chmodSync(sockAddr, 0o766)
})

process.on('beforeExit', () => {
    // clean up sock file
    server.close()
});
