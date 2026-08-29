const { Client } = require("ssh2");

const conn = new Client();
console.log("⚡ Menyiapkan Redis In-Memory Caching di CT 601...");

conn
  .on("ready", () => {
    const cmd = `
pct exec 601 -- bash -c '
set -e
echo "📦 Menginstall Redis Server di CT 601..."
DEBIAN_FRONTEND=noninteractive apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y redis-server

echo "⚙️ Konfigurasi Redis In-Memory Memory Limit (512MB LRU)..."
sed -i "s/^# maxmemory <bytes>/maxmemory 512mb/" /etc/redis/redis.conf || true
sed -i "s/^# maxmemory-policy noeviction/maxmemory-policy allkeys-lru/" /etc/redis/redis.conf || true

systemctl enable redis-server
systemctl restart redis-server

echo "🧪 Menguji Koneksi Redis:"
redis-cli ping

echo "📦 Menginstall modul ioredis di Next.js..."
cd /var/www/cbt-modern
npm install --save ioredis

echo "✅ Redis Server & ioredis Driver Siap Digunakan!"
'
`;

    conn.exec(cmd, (err, stream) => {
      if (err) throw err;
      stream
        .on("close", (code) => {
          console.log(`\n🏁 Setup Redis selesai dengan code: ${code}`);
          conn.end();
        })
        .on("data", (d) => process.stdout.write(d.toString()))
        .stderr.on("data", (d) => process.stderr.write(d.toString()));
    });
  })
  .connect({
    host: "172.16.0.177",
    port: 22,
    username: "root",
    password: "P45und4n",
  });
