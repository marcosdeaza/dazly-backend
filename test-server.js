// test-server.js - Prueba simple del servidor

require('dotenv').config();

console.log('🔍 Probando configuración del servidor...\n');

// Verificar variables de entorno críticas
console.log('📋 Variables de entorno:');
console.log('✅ DATABASE_URL:', process.env.DATABASE_URL ? 'Configurada' : '❌ Falta');
console.log('✅ JWT_SECRET:', process.env.JWT_SECRET ? 'Configurada' : '❌ Falta');
console.log('✅ FRONTEND_URL:', process.env.FRONTEND_URL || 'http://localhost:8080 (default)');
console.log('✅ PORT:', process.env.PORT || '8081 (default)');

// Probar importación de dependencias críticas
console.log('\n📦 Probando dependencias:');

try {
  require('express');
  console.log('✅ express: OK');
} catch (e) {
  console.log('❌ express:', e.message);
}

try {
  require('bcrypt');
  console.log('✅ bcrypt: OK');
} catch (e) {
  console.log('❌ bcrypt:', e.message);
}

try {
  require('jsonwebtoken');
  console.log('✅ jsonwebtoken: OK');
} catch (e) {
  console.log('❌ jsonwebtoken:', e.message);
}

try {
  require('@prisma/client');
  console.log('✅ @prisma/client: OK');
} catch (e) {
  console.log('❌ @prisma/client:', e.message);
}

try {
  require('google-auth-library');
  console.log('✅ google-auth-library: OK');
} catch (e) {
  console.log('⚠️  google-auth-library:', e.message, '(OAuth deshabilitado)');
}

// Probar inicialización básica del servidor
console.log('\n🚀 Probando servidor básico...');

try {
  const express = require('express');
  const app = express();
  
  app.get('/', (req, res) => {
    res.json({ 
      message: 'Dazly API is running!',
      status: 'healthy',
      timestamp: new Date().toISOString()
    });
  });

  const server = app.listen(8082, () => {
    console.log('✅ Servidor de prueba iniciado en puerto 8082');
    console.log('✅ Configuración básica funcional');
    
    // Hacer petición de prueba
    const http = require('http');
    const req = http.get('http://localhost:8082', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('✅ Test GET /:', JSON.parse(data).message);
        server.close(() => {
          console.log('✅ Servidor de prueba cerrado');
          console.log('\n🎉 ¡Configuración básica funcional!');
          console.log('\n📋 Próximo paso: npm run dev en puerto 8081');
        });
      });
    });
    
    req.on('error', (e) => {
      console.log('❌ Error en test:', e.message);
      server.close();
    });
  });

  server.on('error', (e) => {
    console.log('❌ Error iniciando servidor:', e.message);
  });

} catch (error) {
  console.log('❌ Error crítico:', error.message);
  console.log('\n💡 Solución: npm install');
}