#!/bin/bash
# ==============================================================================
# Script Otomatisasi Deploy Ruijie Cloud MCP & Web Dashboard di Debian CT (LXC)
# SMK Pasundan 2 Bandung
# ==============================================================================
set -e

echo "=== [1/5] Memperbarui Paket Sistem Debian ==="
apt-get update -y
apt-get install -y python3 python3-pip python3-venv curl git

APP_DIR="/opt/ruijie-cloud-mcp"
echo "=== [2/5] Menyiapkan Direktori Aplikasi di $APP_DIR ==="
mkdir -p "$APP_DIR"

echo "=== [3/5] Membuat Python Virtual Environment & Install Dependencies ==="
python3 -m venv "$APP_DIR/venv"
"$APP_DIR/venv/bin/pip" install --upgrade pip
if [ -f "$APP_DIR/requirements.txt" ]; then
    "$APP_DIR/venv/bin/pip" install -r "$APP_DIR/requirements.txt"
else
    "$APP_DIR/venv/bin/pip" install mcp httpx pydantic python-dotenv pycryptodome fastapi uvicorn
fi

echo "=== [4/5] Memasang Systemd Service (Auto-Start on Boot) ==="
cat << 'EOF' > /etc/systemd/system/ruijie-mcp.service
[Unit]
Description=Ruijie Cloud Network Controller & MCP Gateway
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/ruijie-cloud-mcp
Environment="PYTHONPATH=/opt/ruijie-cloud-mcp/src"
ExecStart=/opt/ruijie-cloud-mcp/venv/bin/python /opt/ruijie-cloud-mcp/src/ruijie_mcp/web.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable ruijie-mcp.service
systemctl restart ruijie-mcp.service

IP_ADDR=$(hostname -I | awk '{print $1}')
echo "=============================================================================="
echo " [OK] DEPLOYMENT BERHASIL!"
echo " Service Status : systemctl status ruijie-mcp"
echo " Web Dashboard  : http://${IP_ADDR}:8000"
echo " Swagger API    : http://${IP_ADDR}:8000/docs"
echo " MCP SSE URL    : http://${IP_ADDR}:8000/mcp/sse"
echo "=============================================================================="
