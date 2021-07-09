# apisix-javascript-plugin-runner

[Coverage Report](https://zenozeng.github.io/apisix-javascript-plugin-runner/coverage/)

Node.js / Deno / WASM Plugin Runner for APISIX (WIP)

## Roadmap

- [x] Node.js
- [x] Docker Image
- [ ] Add [docs for APISIX ext-plugin](./docs/protocol.md) (DOING)
- [ ] Deno (TODO)
- [ ] WASM (TODO)
- [ ] WASM Example (Golang) (TODO)
- [ ] WASM Example (Rust) (TODO)

## Getting Started

### Installation

```bash
# Create APISIX Network
docker network create apisix
# Etcd
docker run -d --name etcd \
    --network apisix \
    --env ALLOW_NONE_AUTHENTICATION=yes \
    bitnami/etcd:3.4.9
# APISIX (with JavaScript Plugin Runner)
docker run -it --name apisix \
    -v `pwd`/examples/config.yaml:/usr/local/apisix/conf/config.yaml \
    -p 9080:9080 \
    -p 127.0.0.1:9180:9180 \
    -p 9443:9443 \
    --network apisix \
    zenozeng/apisix-javascript-plugin-runner
```

```yaml
# examples/config.yaml
ext-plugin:
  cmd: 
    - "/usr/local/apisix/javascript-plugin-runner/bin/runner"
    - "/usr/local/apisix/javascript-plugin-runner/examples/say.js"

apisix:
  port_admin: 9180
  admin_key:
    -
      name: "admin"
      key: "YOUR_ADMIN_KEY"
      role: admin

etcd:
  host:
    - "http://etcd:2379"
```

Note: Docker images are provided for convenience. Recommended usage is always to build the source.

### Plugin Example

#### examples/say.js

```javascript
class SayPlugin {

    getName() {
        return "say"
    }

    parseConf(conf) {
        return JSON.parse(conf)
    }

    // Filter will be executed on every request with the say plugin configured.
    async filter(conf, request, response) {
        const headers = new Map()
        headers.set('X-Resp-A6-JavaScript-Plugin', 'Say')
        response.body = conf.body
        response.headers = headers
    }

}

module.exports = SayPlugin
```

#### Create route

```bash
# default config.apisix.allow_admin is 127.0.0.0/24, using docker exec
docker exec -it apisix curl -H "Content-Type: application/json" \
    -H 'X-API-KEY: YOUR_ADMIN_KEY' \
    -X PUT \
    --data '{"uri":"/say","methods":["PUT","GET"],"plugins":{"ext-plugin-pre-req":{"conf":[{"name":"say","value":"{\"body\":\"123\"}"}]}}}' \
    http://127.0.0.1:9180/apisix/admin/routes/1
```

#### Test Output

```bash
curl -v http://127.0.0.1:9080/say
```

```
< HTTP/1.1 200 OK
< Date: Fri, 09 Jul 2021 18:20:24 GMT
< Content-Type: text/plain; charset=utf-8
< Transfer-Encoding: chunked
< Connection: keep-alive
< X-Resp-A6-JavaScript-Plugin: Say
< Server: APISIX/2.7
< 
* Connection #0 to host 127.0.0.1 left intact
123
```

## Interface

```typescript
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
```

## Development

- server
    - node.ts: entrypoint for Node.js (Net server listening on `process.env.APISIX_LISTEN_ADDRESS`)
    - rpc.ts: flatbuffers rpc `dispatch(ty: number, input: Uint8Array): Uint8Array`
- runner
    - index.ts: Plugin runner
- ext-plugin
- test
    - integration.test.ts

```bash
npm install
make build
make test
```

## References

- https://github.com/apache/apisix/blob/master/docs/en/latest/external-plugin.md
- https://github.com/apache/apisix-go-plugin-runner/blob/master/internal/server/server.go
- https://github.com/apache/apisix/blob/master/docs/en/latest/plugins/ext-plugin-pre-req.md
