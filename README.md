# apisix-javascript-plugin-runner

[Coverage Report](https://zenozeng.github.io/apisix-javascript-plugin-runner/coverage/)

Node.js / Deno / WASM Plugin Runner for APISIX (WIP)

- [x] Node.js
- [ ] Add [docs for APISIX ext-plugin](./docs/protocol.md) (DOING)
- [ ] Deno (TODO)
- [ ] WASM (TODO)
- [ ] WASM Example (Golang) (TODO)
- [ ] WASM Example (Rust) (TODO)

## Example

### config.yaml

```yaml
ext-plugin:
  cmd: 
    - "/usr/local/apisix/javascript-plugin-runner/bin/runner"
    - "/usr/local/apisix/javascript-plugin-runner/examples/say.js"

apisix:
  allow_admin:
    - 127.0.0.0/24
  port_admin: 9180

  admin_key:
    -
      name: "admin"
      key: YOUR_ADMIN_KEY
      role: admin
```

### examples/say.js

```typescript
class SayPlugin {

    getName() {
        return "say"
    }

    parseConf(conf) {
        conf = conf || '{"body": "example"}'
        return JSON.parse(conf)
    }

    async filter(conf, request, response) {
        const headers = new Map()
        headers.set('X-Resp-A6-JavaScript-Plugin', 'Say')
        response.body = conf.body
        response.headers = headers
    }

}

module.exports = SayPlugin
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

## Types

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

## References

- https://github.com/apache/apisix/blob/master/docs/en/latest/external-plugin.md
- https://github.com/apache/apisix-go-plugin-runner/blob/master/internal/server/server.go
- https://github.com/apache/apisix/blob/master/docs/en/latest/plugins/ext-plugin-pre-req.md
