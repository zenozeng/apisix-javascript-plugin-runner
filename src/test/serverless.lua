local cjson = require "cjson"

return function(conf, ctx) 
    ngx.req.read_body();
    local json = cjson.encode({
        headers = ngx.req.get_headers(),
        request_uri = ngx.var.request_uri,
        args = ngx.req.get_uri_args(),
        body = ngx.req.get_body_data()
    });
    ngx.say(json);
    ngx.exit(200);
end