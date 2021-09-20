all: SHELL:=/bin/bash
workdir := $(shell realpath $$PWD)
uid := $(shell id -u)

.PHONY: build
build:
	git submodule update --init
	npm run build

dev:
	docker run -u $(uid) -v $(workdir):$(workdir) -w $(workdir) -it apisix-javascript-plugin-runner:dev bash

.PHONY: test
test:
	bash test/test.sh

.PHONY: coverage
coverage:
	bash test/test.sh bash /usr/local/bin/coverage-entrypoint.sh

.PHONY: docker-test
docker-test:
	docker build -t apisix-javascript-plugin-runner .