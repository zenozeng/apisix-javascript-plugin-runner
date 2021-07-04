./etcd/etcd 2>&1 &

while ! nc -z 127.0.0.1 2379; do
  sleep 0.1
done

# Start apisix
/usr/bin/apisix init
/usr/bin/apisix init_etcd
/usr/local/openresty/bin/openresty -p /usr/local/apisix -g 'daemon off;' &
while ! nc -z 127.0.0.1 9080; do
  sleep 0.1
done

pushd /usr/local/apisix/javascript-plugin-runner
npm test

popd