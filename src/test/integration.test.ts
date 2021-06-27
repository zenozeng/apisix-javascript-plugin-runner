import {describe, it, expect} from '@jest/globals'
import fetch from 'node-fetch'

const APISIX_IP = process.env.APISIX_IP || '127.0.0.1'

const APISIX_TEST_ENDPOINT = `http://${APISIX_IP}:9080/test`
const APISIX_ADMIN_ENDPOINT = `http://${APISIX_IP}:9180/apisix/admin`
const APISIX_ADMIN_TOKEN = `196e3a4c-ad0d-4a4f-954a-285678b74a24`

describe('APISIX JavaScript Plugin Runner', () => {
    it('should be able to add route with plugin', async () => {
        let resp = await fetch(`${APISIX_ADMIN_ENDPOINT}/routes/1`, {
            method: 'PUT',
            headers: {
                'X-API-KEY': APISIX_ADMIN_TOKEN
            },
            body: JSON.stringify({
                "uri": "/test",
                "remote_addrs": ["127.0.0.0/8"],
                "methods": ["PUT", "GET"],
                "plugins": {
                    "ext-plugin-pre-req": {
                        "conf" : [
                            {"name": "ext-plugin-A", "value": "{\"enable\":\"feature\"}"}
                        ]
                    }
                },
            })
        })
        expect(resp.status).toBe(201)
    })

    it('should be able to set resp', async () => {
        let resp = await fetch(APISIX_TEST_ENDPOINT, {
            method: 'GET'
        })
        console.log((await resp.buffer()).toString())
        expect(resp.status).toBe(200)
    })
})