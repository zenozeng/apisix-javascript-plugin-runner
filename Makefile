all: SHELL:=/bin/bash
workdir := $(shell realpath $$PWD)
uid := $(shell id -u)

.PHONY: build
build:
	docker build -f dev.Dockerfile -t apisix-javascript-plugin-runner:dev .
	docker run -u $(uid) -v $(workdir):$(workdir) -w $(workdir)/src/ext-plugin/ -it apisix-javascript-plugin-runner:dev flatc --ts ext-plugin.fbs
	npm run build

dev:
	docker run -u $(uid) -v $(workdir):$(workdir) -w $(workdir) -it apisix-javascript-plugin-runner:dev bash

.PHONY: test
test:
	bash test/test.sh
