.PHONY: test
test:
	set -ex
	docker build -t apisix-javascript-plugin-runner .
	docker build -t apisix-javascript-plugin-runner:test ./test
	docker run -it apisix-javascript-plugin-runner:test