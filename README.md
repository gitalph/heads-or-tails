# heads-or-tails

1. `git clone`
1. Change environment in docker-compose.yml
1. `docker-compose up -d --build`
1. Add something to the nginx config:
```
server {
	listen 443 ssl;
	server_name heads-or-tails.chernov.us;

        ssl_certificate /etc/letsencrypt/live/heads-or-tails.chernov.us/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/heads-or-tails.chernov.us/privkey.pem;
 
        ssl_protocols TLSv1 TLSv1.1 TLSv1.2;
        ssl_prefer_server_ciphers on;
		ssl_ciphers ECDH+AESGCM:DH+AESGCM:ECDH+AES256:DH+AES256:ECDH+AES128:DH+AES:ECDH+3DES:DH+3DES:RSA+AESGCM:RSA+AES:RSA+3DES:!aNULL:!MD5:!DSS;
		add_header Strict-Transport-Security "max-age=31536000; includeSubdomains";

		location /robots.txt {
			return 200 "User-agent: *\nDisallow: /\n";
		}

		location / {
			proxy_pass http://172.17.0.1:3000;
		}

}
```
