const { Client } = require("ssh2");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

// Create a real colorful PNG with a visible network diagram
// 400x200 PNG with blue server, green router, yellow switch, orange client
const { createCanvas } = (() => {
  // Let's create a real PNG buffer using node canvas or pure PNG / SVG data-uri
  return {};
})();

// Create an SVG and base64 encode it as an image/svg+xml or real PNG
const svgDiagram = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="260" viewBox="0 0 600 260" fill="none">
  <rect width="600" height="260" rx="16" fill="#0f172a" stroke="#334155" stroke-width="2"/>
  
  <!-- Grid background -->
  <defs>
    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" stroke-width="1"/>
    </pattern>
    <linearGradient id="blueGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#3b82f6"/>
      <stop offset="100%" stop-color="#1d4ed8"/>
    </linearGradient>
    <linearGradient id="emeraldGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#10b981"/>
      <stop offset="100%" stop-color="#047857"/>
    </linearGradient>
    <linearGradient id="purpleGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#a855f7"/>
      <stop offset="100%" stop-color="#7e22ce"/>
    </linearGradient>
  </defs>
  <rect width="600" height="260" rx="16" fill="url(#grid)" />

  <!-- Connecting Cables -->
  <path d="M 120 130 L 260 130" stroke="#38bdf8" stroke-width="3" stroke-dasharray="6,4"/>
  <path d="M 340 130 L 480 130" stroke="#34d399" stroke-width="3"/>
  <path d="M 300 90 L 300 45" stroke="#f472b6" stroke-width="3"/>
  <path d="M 300 170 L 300 215" stroke="#fbbf24" stroke-width="3"/>

  <!-- Router 1 (WAN / Gateway) -->
  <rect x="60" y="100" width="120" height="60" rx="12" fill="url(#blueGrad)" stroke="#60a5fa" stroke-width="2"/>
  <text x="120" y="128" fill="#ffffff" font-family="Arial, sans-serif" font-size="13" font-weight="bold" text-anchor="middle">Router R1 (WAN)</text>
  <text x="120" y="145" fill="#bfdbfe" font-family="Arial, sans-serif" font-size="10" text-anchor="middle">192.168.1.1/24 (ens18)</text>

  <!-- Switch Core -->
  <rect x="240" y="100" width="120" height="60" rx="12" fill="url(#emeraldGrad)" stroke="#34d399" stroke-width="2"/>
  <text x="300" y="128" fill="#ffffff" font-family="Arial, sans-serif" font-size="13" font-weight="bold" text-anchor="middle">Switch Managed</text>
  <text x="300" y="145" fill="#a7f3d0" font-family="Arial, sans-serif" font-size="10" text-anchor="middle">VLAN 10, 20 (Trunk)</text>

  <!-- Server Debian 12 -->
  <rect x="420" y="100" width="130" height="60" rx="12" fill="url(#purpleGrad)" stroke="#c084fc" stroke-width="2"/>
  <text x="485" y="128" fill="#ffffff" font-family="Arial, sans-serif" font-size="13" font-weight="bold" text-anchor="middle">Server Debian 12</text>
  <text x="485" y="145" fill="#e9d5ff" font-family="Arial, sans-serif" font-size="10" text-anchor="middle">192.168.10.254 (ens19)</text>

  <!-- Client PC A -->
  <rect x="240" y="15" width="120" height="35" rx="8" fill="#1e293b" stroke="#f472b6" stroke-width="1.5"/>
  <text x="300" y="37" fill="#f472b6" font-family="Arial, sans-serif" font-size="11" font-weight="bold" text-anchor="middle">💻 Client Lab 1 (VLAN 10)</text>

  <!-- Client PC B -->
  <rect x="240" y="210" width="120" height="35" rx="8" fill="#1e293b" stroke="#fbbf24" stroke-width="1.5"/>
  <text x="300" y="232" fill="#fbbf24" font-family="Arial, sans-serif" font-size="11" font-weight="bold" text-anchor="middle">💻 Client Lab 2 (VLAN 20)</text>
</svg>`;

const svgBase64 = Buffer.from(svgDiagram).toString("base64");
const svgDataUri = `data:image/svg+xml;base64,${svgBase64}`;

async function updateLiveQuestionWithVisibleDiagram() {
  console.log("=== MEMPERBARUI SOAL DENGAN DIAGRAM TOPOLOGI VISUAL ===");

  const conn = new Client();
  conn
    .on("ready", () => {
      const qContent = `Perhatikan gambar skema topologi jaringan Debian 12 berikut ini:<br/><img src=\\"${svgDataUri}\\" alt=\\"Skema Topologi Jaringan\\" /><br/>Berdasarkan skema di atas, interface yang bertindak sebagai gateway WAN adalah...`;
      
      const sql = `
        UPDATE Question 
        SET content = '${qContent}' 
        WHERE content LIKE '%Perhatikan gambar skema topologi jaringan Debian 12%';
      `;

      const cmd = `pct exec 602 -- mysql -u cbtuser -pcbtpassword2026 zyacbt_modern -e "${sql}"`;
      conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream
          .on("close", (code) => {
            console.log(`Update Question content selesai dengan code: ${code}`);
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
}

updateLiveQuestionWithVisibleDiagram().catch(console.error);
