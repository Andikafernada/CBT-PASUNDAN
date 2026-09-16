module.exports = {
  apps: [{
    name: 'cbt-modern',
    script: 'node_modules/.bin/next',
    args: 'start',
    cwd: '/var/www/cbt-modern',
    instances: 'max',
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    error_file: '/var/log/cbt-modern/error.log',
    out_file: '/var/log/cbt-modern/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    restart_delay: 5000,
    max_restarts: 10,
    min_uptime: '30s',
  }]
}
