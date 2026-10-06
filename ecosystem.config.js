// Configuração do PM2 para produção (servidor Ubuntu).
// Uso:  npm run build && pm2 start ecosystem.config.js && pm2 save
module.exports = {
  apps: [
    {
      name: 'murus-backend',
      cwd: __dirname, // garante a leitura do .env desta pasta
      script: 'dist/main.js',
      instances: 1, // o cache de listagem fica em memória: mantenha 1 instância
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '400M',
      // As demais variáveis vêm do arquivo .env (lido pelo próprio app).
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
