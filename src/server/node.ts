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
import RPCServer from './rpc.js'
import Runner from '../runner/index.js'
import Logger from '../util/logger.js'

/**
 * Import CommonJS Module and ES Module
 * 
 * @param pluginPath 
 * @returns module or null
 */
async function importPlugin(pluginPath: string) {
    try {
        console.log(`Loading plugin: ${pluginPath}`)
        let { default: Plugin } = await import(pluginPath)
        return new Plugin()
    } catch (e) {
        console.error(`Fail to import plugin ${pluginPath}`)
        console.error(e)
        return null
    }
}

async function init() {
    const sockAddr = process.env.APISIX_LISTEN_ADDRESS.replace(/^unix:/, '')
    const runner = new Runner()
    const rpcServer = new RPCServer(runner)
    const args = process.argv.slice(2)
    const logger = new Logger()
    logger.log(`APISIX JavaScript Plugin Runner v0.2 Listening on ${sockAddr}`)

    for (let pluginPath of args) {
        let plugin = await importPlugin(pluginPath)
        if (plugin) {
            runner.registerPlugin(plugin)
        }
    }

    let connCount = -1
    const server = net.createServer((conn) => {

        let buf = Buffer.alloc(0)
        let closed = false

        let shift = (size: number) => {
            let part1 = Buffer.alloc(size)
            let part2 = Buffer.alloc(buf.byteLength - size)
            buf.copy(part1, 0, 0, size)
            if (buf.byteLength - size > 0) {
                buf.copy(part2, 0, size, buf.byteLength)
            }
            buf = part2
            return part1
        }

        let callbacks: {
            size: number,
            resolve: () => void
            reject: (e: any) => void
        }[] = []

        rpcServer.onConnection({
            read: async (size: number) => {
                if (buf.byteLength >= size) {
                    return shift(size)
                }
                if (closed) {
                    throw new Error('APISIX JavaScript Plugin Runner: connection closed')
                }
                return new Promise((resolve, reject) => {
                    callbacks.push({
                        size,
                        resolve: () => {
                            resolve(shift(size))
                        },
                        reject,
                    })
                })

            },
            write: async (data: Uint8Array) => {
                return conn.write(data)
            }
        })

        logger.debug(`Client connected`)

        connCount++
        let connId = connCount
        conn.on('data', async (d: Buffer) => {
            logger.debug(`Conn#${connId}: receive data: ${d.length} bytes`)
            buf = Buffer.concat([buf, d])
            let callback = callbacks[0]
            if (callback && buf.byteLength >= callback.size) {
                callbacks.shift()
                callback.resolve()
            }
        })

        conn.on('close', () => {
            closed = true
        })

        conn.on('error', (err) => {
            console.error(err)
            for (let callback of callbacks) {
                callback.reject(new Error('APISIX JavaScript Plugin Runner: connection error'))
            }
        })
    })

    server.listen(sockAddr, () => {
        fs.chmodSync(sockAddr, 0o766)
    })

    process.on('beforeExit', () => {
        // clean up sock file
        server.close()
    });

}

init()