./etcd/etcd 2>&1 &
while ! nc -z 127.0.0.1 2379; do   
  sleep 0.1
done
/usr/bin/apisix init 
/usr/bin/apisix init_etcd 
/usr/local/openresty/bin/openresty -p /usr/local/apisix -g 'daemon off;'
