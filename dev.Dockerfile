FROM debian:buster-20210621

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

RUN mkdir -p /opt
WORKDIR /opt
RUN git clone --progress --verbose --depth=1 https://github.com/google/flatbuffers.git
WORKDIR /opt/flatbuffers
RUN CC=/usr/bin/clang CXX=/usr/bin/clang++ cmake -G "Unix Makefiles"
RUN make && make install
RUN flatc --version