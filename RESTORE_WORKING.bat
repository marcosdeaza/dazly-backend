@echo off
echo 🔄 Restaurando configuración que funcionaba...
echo.

echo 📋 1. Instalando dependencias del sistema funcional...
npm install

echo.
echo 📋 2. Copiando configuración .env funcional...
copy "old\dazly-api\.env" ".env"

echo.
echo 📋 3. Iniciando servidor restaurado...
echo ✅ Configuración ES modules
echo ✅ Passport Google OAuth  
echo ✅ Base de datos en memoria (para testing)
echo ✅ JWT funcionando
echo.

npm run dev