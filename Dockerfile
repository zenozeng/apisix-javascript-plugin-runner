FROM node:18.6.0 as builder
COPY --from=denoland/deno:1.16.2 /usr/bin/deno /usr/bin/deno
ENV DEBIAN_FRONTEND=noninteractive
RUN sed -i 's/deb.debian.org/mirrors.ustc.edu.cn/g' /etc/apt/sources.list
RUN apt-get update; \
    apt-get install -y --no-install-recommends \
    ca-certificates \
    build-essential \
    cmake \
    clang \
    git \
    openssh-client \
    unzip \
    wget; \
    rm -rf /var/lib/apt/lists/*
COPY . /usr/local/apisix/javascript-plugin-runner
WORKDIR /usr/local/apisix/javascript-plugin-runner
RUN npm install
RUN make build

# APISIX with JavaScript Plugin Runner
FROM apache/apisix:2.13.2-alpine
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.ustc.edu.cn/g' /etc/apk/repositories

# Node.js
COPY --from=node:18.6.0-alpine /usr/local/include/node /usr/local/include/node
COPY --from=node:18.6.0-alpine /usr/local/lib/node_modules /usr/local/lib/node_modules
COPY --from=node:18.6.0-alpine /usr/local/bin/node /usr/local/bin/node
RUN ln -s ../lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm; \
    ln -s ../lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx;

# APISIX JavaScript Plugin Runner
COPY --from=builder /usr/local/apisix/javascript-plugin-runner /usr/local/apisix/javascript-plugin-runner