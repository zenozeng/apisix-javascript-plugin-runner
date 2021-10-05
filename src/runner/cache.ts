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

class TTLCache {
    private cache: {
        [key: string]: {val: any, expireAt: number}
    }

    constructor() {
        this.cache = {}
        this.background(100, 10);
    }

    set(k: string, val: any, ttl: number) {
        let expireAt = Date.now() + ttl;
        this.cache[k] = {val, expireAt}
    }

    /**
     * 
     * @param k key
     * @returns values (null if not found)
     */
    get(k: string) {
        let v = this.cache[k]
        if (!v) {
            return null
        }
        return v.val;
    }

    async sleep(ms: number) {
        await new Promise((resolve) => setTimeout(resolve, ms))
    }

    /**
     * Clear expired keys
     * 
     * @param interval clear expired keys every interval ms
     * @param timeLimit time limit for a gc cycle
     */
    async background(interval: number, timeLimit: number) {
        while (true) {
            await this.sleep(interval)
            let start = Date.now()
            let keys = Object.keys(this.cache)
            for (let key of keys) {
                let {expireAt} = this.cache[key]
                let now = Date.now()
                if (now >= expireAt) {
                    this.cache[key] = null
                }
                if (now - start > timeLimit) {
                    break
                }
            }
        }
    }
}

export default TTLCache