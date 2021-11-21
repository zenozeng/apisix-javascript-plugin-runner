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

import { createHash } from "https://deno.land/std@0.113.0/hash/mod.ts";

interface Config {
    body: string
}

interface Response {
    body: string
    headers: Map<string, string>
}

class SayPlugin {

    getName() {
        return "deno-say"
    }

    parseConf(conf: string) {
        conf = conf || '{"body": "deno:say"}'
        return JSON.parse(conf) as Config
    }

    etag(body: string) {
        const hash = createHash('sha256');
        hash.update(body)
        return hash.toString('hex')
    }

    // Filter will be executed on every request with the say plugin configured.
    filter(conf: Config, _request: unknown, response: Response) {
        const body = conf.body;
        const headers = new Map()
        headers.set('X-Resp-A6-JavaScript-Plugin', body)
        headers.set('ETag', this.etag(body))
        response.body = conf.body
        response.headers = headers
    }

}

export default SayPlugin