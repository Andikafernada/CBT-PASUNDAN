const { Client } = require("ssh2");

const conn = new Client();
conn
  .on("ready", () => {
    const cmd = `
pct exec 601 -- bash -c '
cat << "EOF" > /etc/nginx/sites-available/cbt
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    client_max_body_size 100M;

    gzip on;
    gzip_proxied any;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;
    gzip_vary on;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

nginx -t
systemctl restart nginx

echo "=== TEST NGINX PORT 80 ==="
curl -s -I http://127.0.0.1 | head -n 10
'
`;
    conn.exec(cmd, (err, stream) => {
      if (err) throw err;
      let out = "";
      stream
        .on("close", () => {
          console.log(out);
          conn.end();
        })
        .on("data", (d) => (out += d.toString()))
        .stderr.on("data", (d) => (out += d.toString()));
    });
  })
  .connect({
    host: "172.16.0.177",
    port: 22,
    username: "root",
    password: "P45und4n",
  });
