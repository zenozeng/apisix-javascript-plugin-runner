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

import { describe, it, expect } from '@jest/globals'
import fetch from 'node-fetch'
import * as fs from 'fs'
import * as crypto from 'crypto'

const APISIX_IP = process.env.APISIX_IP || '127.0.0.1'

const APISIX_TEST_ENDPOINT = `http://${APISIX_IP}:9080`
const APISIX_ADMIN_ENDPOINT = `http://${APISIX_IP}:9180/apisix/admin`
const APISIX_ADMIN_TOKEN = `196e3a4c-ad0d-4a4f-954a-285678b74a24`
const lua = fs.readFileSync('src/test/serverless.lua', { encoding: 'utf-8' })

describe('APISIX JavaScript Plugin Runner', () => {
    it('should be able to add route with plugin', async () => {
        let resp = await fetch(`${APISIX_ADMIN_ENDPOINT}/routes/1`, {
            method: 'PUT',
            headers: {
                'X-API-KEY': APISIX_ADMIN_TOKEN
            },
            body: JSON.stringify({
                "uri": "/say",
                "remote_addrs": ["127.0.0.0/8"],
                "methods": ["PUT", "GET"],
                "plugins": {
                    "ext-plugin-pre-req": {
                        "conf": [
                            { "name": "say", "value": "{\"body\":\"123\"}" }
                        ]
                    }
                },
            })
        })
        expect(resp.status).toBe(201)
    })

    it('should be able to set resp', async () => {
        let resp = await fetch(APISIX_TEST_ENDPOINT + '/say', {
            method: 'GET'
        })
        expect(resp.status).toBe(200)
        expect(resp.headers.get('X-Resp-A6-JavaScript-Plugin')).toBe('Say')
        expect((await resp.buffer()).toString()).toBe('123')
    })

    it('should be able to add route for request test', async () => {
        let resp = await fetch(`${APISIX_ADMIN_ENDPOINT}/routes/2`, {
            method: 'PUT',
            headers: {
                'X-API-KEY': APISIX_ADMIN_TOKEN
            },
            body: JSON.stringify({
                "uri": "/mirror",
                "remote_addrs": ["127.0.0.0/8"],
                "methods": ["PUT", "GET", "POST"],
                "plugins": {
                    "serverless-pre-function": {
                        "phase": "access",
                        "functions": [lua]
                    }
                },
            })
        })
        expect(resp.status).toBe(201)
        resp = await fetch(APISIX_TEST_ENDPOINT + '/mirror', {
            method: 'POST',
            headers: {
                'X-Hello': 'world'
            },
            body: '123'
        })
        expect(resp.status).toBe(200)
        const { body, headers, request_uri } = await resp.json()
        expect(body).toBe('123')
        expect(headers['x-hello']).toBe('world')
        expect(request_uri).toBe('/mirror')
    })

    it('should be able to rewrite', async () => {
        let requestBody = 'T' + Math.random()
        let conf = {
            header: '123',
            path: '/mirror'
        }
        let resp = await fetch(`${APISIX_ADMIN_ENDPOINT}/routes/3`, {
            method: 'PUT',
            headers: {
                'X-API-KEY': APISIX_ADMIN_TOKEN
            },
            body: JSON.stringify({
                "uri": "/rewrite",
                "remote_addrs": ["127.0.0.0/8"],
                "methods": ["PUT", "GET", "POST"],
                "plugins": {
                    "ext-plugin-pre-req": {
                        "conf": [
                            { "name": "rewrite", "value": JSON.stringify(conf) }
                        ]
                    }
                },
                "upstream": {
                    "type": "roundrobin",
                    "nodes": {
                        [APISIX_TEST_ENDPOINT.replace('http://', '')]: 1
                    }
                },
            })
        })
        expect(resp.status).toBe(201)

        resp = await fetch(APISIX_TEST_ENDPOINT + '/rewrite', {
            method: 'POST',
            body: requestBody
        })
        expect(resp.status).toBe(200)
        const { headers, request_uri, args } = await resp.json()
        expect(request_uri).toBe(conf.path + '?hello=world')
        expect(headers['X-Req-A6-JavaScript-Plugin'.toLowerCase()]).toBe('Rewrite')
        expect(headers['X-Req-A6-JavaScript-Rewrite-Example'.toLowerCase()]).toBe(conf.header)
        expect(headers['X-Req-A6-JavaScript-Rewrite-Example-Body'.toLocaleLowerCase()]).toBe(requestBody)
        expect(args['hello']).toBe('world')
    })

    it('should be able run deno plugin', async () => {
        const expectedBody = 'deno:say:' + Math.random()
        let resp = await fetch(`${APISIX_ADMIN_ENDPOINT}/routes/1`, {
            method: 'PUT',
            headers: {
                'X-API-KEY': APISIX_ADMIN_TOKEN
            },
            body: JSON.stringify({
                "uri": "/deno",
                "remote_addrs": ["127.0.0.0/8"],
                "methods": ["PUT", "GET"],
                "plugins": {
                    "ext-plugin-pre-req": {
                        "conf": [
                            { "name": "deno-say", "value": "{\"body\":\"" + expectedBody + "\"}" }
                        ]
                    }
                },
            })
        })
        expect(resp.status).toBe(200)
        resp = await fetch(APISIX_TEST_ENDPOINT + '/deno', {
            method: 'GET'
        })

        expect(resp.status).toBe(200)
        expect(resp.headers.get('ETag')).toBe(crypto.createHash('sha256').update(expectedBody).digest('hex'))
        expect((await resp.buffer()).toString()).toBe(expectedBody)
    })
})