module.exports = {
  apps: [
    {
      name: 'holotv-server',
      script: 'node',
      args: 'dist/main.js', // Убедитесь, что путь к main.js верный
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
