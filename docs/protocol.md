# Notes for APISIX ext-plugin

## Plugin Lifecycle

### ParseConf

- ParseConf is called when the configuration is changed. 
- Its output is unique per route.

### Filter

- Filter is called when a request hits the route

## Plugin Runner Lifecycle

### SETUP_RUNNER

[setup_runner](https://github.com/apache/apisix/blob/eea3d84ebaad4f3bcbdc263521a1c41c9212a7c6/apisix/plugins/ext-plugin/init.lua#L593): APISIX runs the plugin runner as a subprocess (spawn_proc ext-plugin.cmd)

### RPC_PREPARE_CONF

```
phase_func(): failed to receive RPC_PREPARE_CONF: timeout, client: 127.0.0.1, server: _, request: "GET /test HTTP/1.1", host: "127.0.0.1:9080"
```

### RPC_HTTP_REQ_CALL

## Data

HeaderLen = 4

- TY: First byte
- Length: 3 Bytes

### TY

```
RPCError = 0
RPCPrepareConf = 1
RPCHTTPReqCall = 2
```

### Flatbuffers

- https://github.com/api7/ext-plugin-proto/blob/main/ext-plugin.fbs

## References

- https://github.com/apache/apisix/blob/eea3d84ebaad4f3bcbdc263521a1c41c9212a7c6/apisix/plugins/ext-plugin/init.lua
- https://google.github.io/flatbuffers/
- https://github.com/apache/apisix-go-plugin-runner/blob/dffe3beae93be9ea632d84763c911e66b6130c28/internal/server/server.go#L124
- https://github.com/apache/apisix-go-plugin-runner/commit/3374511cb81b011569b4c5d206261491a9f47d1e