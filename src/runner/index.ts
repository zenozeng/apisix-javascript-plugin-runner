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

import Cache from './cache'
import Logger from '../util/logger'

interface Plugin {
    getName(): string
    parseConf(conf: string): string
    filter(conf: Object, request: Request, response: Response): Promise<void>
}

interface Request {
    // The id is for debug. It will be recycled when the number is exhausted
    id: number;

    // the path of the request.
    path: string;

    // The associated Headers object of the request.
    // See·https://developer.mozilla.org/en-US/docs/Web/API/Headers
    headers: Headers;

    srcIp: number[];

    // Request's method (GET, POST, etc.)
    method: string;

    // The associated Args object of the request.
    args: Args;
}


interface Args {
    keys(): Iterable<string>
    get(k: string): string
    set(k: string, v: string): Args
}

interface Headers {
    keys(): Iterable<string>
    get(k: string): string
    set(k: string, v: string): Headers
}

interface Response {
    // The status code of the response (200, 404, etc.)
    status?: number;
    // The associated Headers object of the response.
    // See https://developer.mozilla.org/en-US/docs/Web/API/Headers
    headers?: Headers;
    // The body of the response
    body?: Uint8Array | string;
}

class Runner {
    public confCacheTTL: number
    private plugins: Plugin[]
    private pluginMap: {
        [name: string]: Plugin
    }
    private cacheCount: number
    private keyCache: Cache
    private tokenCache: Cache
    private logger: Logger

    constructor() {
        this.plugins = []
        this.pluginMap = {}
        this.cacheCount = 0
        this.keyCache = new Cache()
        this.tokenCache = new Cache()
        this.logger = new Logger()
    }

    registerPlugin(plugin: Plugin) {
        console.log(`Register JavaScript Plugin: ${plugin.getName()}`)
        this.pluginMap[plugin.getName()] = plugin
        this.plugins.push(plugin)
    }

    genCacheToken() {
        this.cacheCount++
        return this.cacheCount
    }

    /**
     * prepareConf
     * 
     * @param key idempotent key (APISIX >= 2.9)
     * @param confList 
     * @returns 
     */
    prepareConf(key: string, confList: {name: string, value: string}[]): number {
        if (key) {
            let token = this.keyCache.get(key)
            this.logger.debug("prepareConf: idempotent key: ", key, "token: ", token)
            if (token !== null) {
                return token as number
            }
        }
        confList = confList.
            filter(({name}) => this.pluginMap[name]).
            map(({name, value}) => {
                return {name, value: this.pluginMap[name].parseConf(value)}
            })
        const token = this.genCacheToken()
        this.tokenCache.set(token.toString(), confList)
        if (key) {
            this.keyCache.set(key, token)
        }
        return token
    }

    async httpReqCall(confToken: number, request: Request) {
        const cache = this.tokenCache.get(confToken.toString()) as {name: string, value: string}[]
        if (!cache) {
            throw new Error(`Cache ${confToken} not found`)
        }
        this.logger.debug({cache})
        const response = {} as Response
        for (let {name, value} of cache)  {
            this.logger.debug(name, value)
            await this.pluginMap[name].filter(value, request, response)
        }
        const isStop = response.body || response.status || response.headers
        if (isStop) {
            if (!response.status) {
                response.status = 200 // defaults to 200
            }
        }
        return {isStop, response, request}
    }

}

export default Runner
export {Request, Response, Headers, Plugin}