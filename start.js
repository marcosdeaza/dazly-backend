// start.js - Script de inicio actualizado (OAuth Service Account)

require('dotenv').config();
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Iniciando Dazly API...\n');

// Verificar variables de entorno críticas
const requiredVars = [
  'JWT_SECRET',
  'GOOGLE_CLOUD_PROJECT_ID',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET'
];

const missing = requiredVars.filter(varName => !process.env[varName]);

if (missing.length > 0) {
  console.error('❌ Variables de entorno faltantes:');
  missing.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.error('\nConfigura estas variables en el archivo .env\n');
  process.exit(1);
}

// Verificar archivo de Service Account si se usa modo archivo
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (serviceAccountPath && !fs.existsSync(serviceAccountPath)) {
  console.error('❌ Archivo de Service Account no encontrado:');
  console.error(`   ${serviceAccountPath}`);
  console.error('\nAsegúrate de tener el archivo JSON de credenciales\n');
  process.exit(1);
}

console.log('✅ Variables de entorno configuradas');
console.log(`📍 Project ID: ${process.env.GOOGLE_CLOUD_PROJECT_ID}`);
console.log(`🔐 Google OAuth: Configurado`);
console.log(`🤖 Vertex AI: ${serviceAccountPath ? 'Service Account file' : 'Environment credentials'}`);
console.log(`🔑 JWT Secret: ${process.env.JWT_SECRET ? 'Configured' : 'Missing'}`);
if (serviceAccountPath) {
  console.log(`📄 Service Account: ${path.basename(serviceAccountPath)}`);
}
console.log();

// Iniciar servidor
console.log('🔄 Iniciando servidor...\n');

const server = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: true
});

server.on('close', (code) => {
  console.log(`\n📊 Servidor terminado con código ${code}`);
});

server.on('error', (error) => {
  console.error('❌ Error iniciando servidor:', error);
});

// Manejo de señales para cerrar correctamente
process.on('SIGINT', () => {
  console.log('\n🔄 Cerrando servidor...');
  server.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🔄 Cerrando servidor...');
  server.kill('SIGTERM');
});