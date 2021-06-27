# Notes for APISIX ext-plugin

## Lifecycle

1. [setup_runner](https://github.com/apache/apisix/blob/eea3d84ebaad4f3bcbdc263521a1c41c9212a7c6/apisix/plugins/ext-plugin/init.lua#L593): spawn_proc ext-plugin.cmd

### RPC_PREPARE_CONF

```
phase_func(): failed to receive RPC_PREPARE_CONF: timeout, client: 127.0.0.1, server: _, request: "GET /test HTTP/1.1", host: "127.0.0.1:9080"
```

## References

- https://github.com/apache/apisix/blob/eea3d84ebaad4f3bcbdc263521a1c41c9212a7c6/apisix/plugins/ext-plugin/init.lua