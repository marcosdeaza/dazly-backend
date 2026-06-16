@echo off
echo 🔧 Diagnóstico y reparación de autenticación...
echo.

echo 📋 1. Probando configuración básica...
node test-server.js

echo.
echo 📋 2. Instalando dependencias faltantes...
npm install

echo.
echo 📋 3. Verificando que el servidor arranca...
echo ⏳ Iniciando servidor en puerto 8081...
echo ⏳ Presiona Ctrl+C para detener si funciona
echo.

npm run dev