module.exports = {
  apps: [
    {
      name: 'holotv-server',
      script: 'node',
      args: 'dist/main.js',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
