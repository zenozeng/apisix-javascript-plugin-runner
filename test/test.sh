#!/bin/bash

PROJECT_ROOT=$(cd $(dirname $0)/..; pwd -P)
DOCKER_IMAGE=apisix-javascript-plugin-runner:test
CONTAINER_NAME=apisix-ext-plugin-test

docker rm -f $CONTAINER_NAME

set -ex

docker build -t $DOCKER_IMAGE $PROJECT_ROOT/test
docker run \
    --name $CONTAINER_NAME \
    -p 9180:9180 \
    -p 9080:9080 \
    -v $PROJECT_ROOT:/usr/local/apisix/javascript-plugin-runner \
    $DOCKER_IMAGE $@