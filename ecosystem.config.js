module.exports = {
  apps: [
    {
      name: 'holotv-server',
      script: 'npm',
      args: 'run start:prod',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
