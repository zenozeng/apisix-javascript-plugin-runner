all: SHELL:=/bin/bash
workdir := $(shell pwd -P)
uid := $(shell id -u)

.PHONY: build
build:
	npm run build
	make --directory examples/deno-say build

dev:
	docker run -u $(uid) -v $(workdir):$(workdir) -w $(workdir) -it apisix-javascript-plugin-runner:dev bash

.PHONY: test
test:
	bash -e test/test.sh

.PHONY: coverage
coverage:
	bash test/test.sh bash /usr/local/bin/coverage-entrypoint.sh

.PHONY: docker-test
docker-test:
	docker build -t apisix-javascript-plugin-runner .