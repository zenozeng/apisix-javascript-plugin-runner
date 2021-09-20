FROM node:16.4.2 as builder
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
RUN mkdir -p /opt && \
    cd /opt && \
    git clone --progress --verbose --depth=1 https://github.com/google/flatbuffers.git && \
    cd /opt/flatbuffers && \
    CC=/usr/bin/clang CXX=/usr/bin/clang++ cmake -G "Unix Makefiles" && \
    make && make install && \
    flatc --version
COPY . /usr/local/apisix/javascript-plugin-runner
WORKDIR /usr/local/apisix/javascript-plugin-runner
RUN cd src/ext-plugin/ && flatc --ts ext-plugin.fbs
RUN npm install
RUN npm run build

# APISIX with JavaScript Plugin Runner
FROM apache/apisix:2.9-alpine
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.ustc.edu.cn/g' /etc/apk/repositories

# Node.js
COPY --from=node:16.4.2-alpine /usr/local/include/node /usr/local/include/node
COPY --from=node:16.4.2-alpine /usr/local/lib/node_modules /usr/local/lib/node_modules
COPY --from=node:16.4.2-alpine /usr/local/bin/node /usr/local/bin/node
RUN ln -s ../lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm; \
    ln -s ../lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx;

# APISIX JavaScript Plugin Runner
COPY --from=builder /usr/local/apisix/javascript-plugin-runner /usr/local/apisix/javascript-plugin-runner