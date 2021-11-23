FROM apache/apisix:2.9-alpine

# Etcd
COPY --from=bitnami/etcd:3.5.0 /opt/bitnami/etcd/bin/etcd /opt/bitnami/etcd/bin/etcdctl /usr/local/bin/

# Deno
COPY --from=denoland/deno:1.16.2 /usr/bin/deno /usr/bin/deno

# Node.js
COPY --from=node:17.1.0-alpine /usr/local/include/node /usr/local/include/node
COPY --from=node:17.1.0-alpine /usr/local/lib/node_modules /usr/local/lib/node_modules
COPY --from=node:17.1.0-alpine /usr/local/bin/node /usr/local/bin/node
RUN ln -s ../lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm; \
    ln -s ../lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx;

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
COPY coverage-entrypoint.sh /usr/local/bin/coverage-entrypoint.sh

COPY config.yaml /usr/local/apisix/conf/config.yaml
COPY coverage-config.yaml /usr/local/apisix/conf/coverage-config.yaml
CMD ["bash", "/usr/local/bin/entrypoint.sh"]