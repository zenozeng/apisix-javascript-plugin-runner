all: SHELL:=/bin/bash
workdir := $(shell realpath $$PWD)
uid := $(shell id -u)

.PHONY: build
build:
	docker build -f dev.Dockerfile -t apisix-javascript-plugin-runner:dev .
	docker run -u $(uid) -v $(workdir):$(workdir) -w $(workdir)/src/ext-plugin/ apisix-javascript-plugin-runner:dev flatc --ts ext-plugin.fbs
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