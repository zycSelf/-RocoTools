module.exports = {
  apps: [{
    name: 'roco',
    script: 'src/index.js',
    cwd: __dirname,
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
    },

    // Log configuration
    output: './logs/out.log',
    error: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,       // Merge logs from all cluster instances into one file
    max_size: '10M',        // Rotate when file exceeds 10MB
    retain: 7,              // Keep 7 rotated files
    compress: true,         // Gzip rotated files

    // Process management
    max_memory_restart: '300M',
    watch: false,
    autorestart: true,
    restart_delay: 3000,
    max_restarts: 10,
    min_uptime: '10s',
  }],
};
