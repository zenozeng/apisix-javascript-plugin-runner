# instrument
pushd /usr/local/apisix/javascript-plugin-runner
rm -rf coverage
rm -rf instrument
npm run build
node_modules/.bin/nyc instrument ./dist ./instrument
ls -lah instrument/server/node.js
echo "" >> ./instrument/server/node.js
echo 'setInterval(() => {fs.writeFileSync("/usr/local/apisix/javascript-plugin-runner/coverage/coverage.json", JSON.stringify(global.__coverage__))}, 1000)' >> ./instrument/server/node.js
cat instrument/server/node.js
ls -lah instrument/server/node.js

mkdir -p coverage
cat /usr/local/apisix/conf/coverage-config.yaml > /usr/local/apisix/conf/config.yaml
cat /usr/local/apisix/conf/config.yaml
popd

# test
bash /usr/local/bin/entrypoint.sh

# generate report
pushd /usr/local/apisix/javascript-plugin-runner
sleep 3
node_modules/.bin/nyc report --reporter=html --reporter=text-summary --temp-dir coverage
popd