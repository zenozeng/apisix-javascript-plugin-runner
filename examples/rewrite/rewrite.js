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

class RewritePlugin {

    getName() {
        return "rewrite"
    }

    parseConf(conf) {
        return JSON.parse(conf)
    }

    async filter(conf, request, response) {
        let body = await request.body()
        console.log({ body })
        request.headers.set('X-Req-A6-JavaScript-Plugin', 'Rewrite')
        request.headers.set('X-Req-A6-JavaScript-Rewrite-Example', conf.header)
        request.headers.set('X-Req-A6-JavaScript-Rewrite-Example-Body', body)
        request.path = conf.path
        request.args.set('hello', 'world')
    }

}

module.exports = RewritePlugin