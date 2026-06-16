#!/bin/bash

# 🚀 Dazly API - Production Startup Script
# Este script inicia el backend en modo producción

echo "🚀 Iniciando Dazly API en modo producción..."

# Verificar que Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado. Por favor instálalo primero."
    exit 1
fi

# Verificar que existe el archivo .env
if [ ! -f .env ]; then
    echo "⚠️  Advertencia: No se encontró archivo .env"
    echo "Copiando .env.example a .env..."
    cp .env.example .env
    echo "⚠️  Por favor, edita el archivo .env con tus credenciales antes de continuar."
    exit 1
fi

# Instalar dependencias si es necesario
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias..."
    npm install --production
fi

# Generar cliente Prisma
echo "🔧 Generando cliente Prisma..."
npx prisma generate

# Ejecutar migraciones
echo "🗄️  Ejecutando migraciones de base de datos..."
npx prisma migrate deploy

# Verificar si PM2 está instalado
if ! command -v pm2 &> /dev/null; then
    echo "📦 Instalando PM2..."
    npm install -g pm2
fi

# Detener instancia anterior si existe
pm2 delete dazly-api 2>/dev/null || true

# Iniciar con PM2
echo "🚀 Iniciando servidor con PM2..."
pm2 start src/index.ts --name dazly-api --interpreter ts-node

# Guardar configuración de PM2
pm2 save

# Mostrar logs
echo ""
echo "✅ Dazly API iniciado exitosamente!"
echo ""
echo "📊 Comandos útiles:"
echo "  - Ver logs:       pm2 logs dazly-api"
echo "  - Ver estado:     pm2 status"
echo "  - Reiniciar:      pm2 restart dazly-api"
echo "  - Detener:        pm2 stop dazly-api"
echo "  - Monitorear:     pm2 monit"
echo ""
echo "🌐 El servidor debería estar corriendo en el puerto especificado en .env"
echo ""

# Mostrar logs en tiempo real
pm2 logs dazly-api --lines 50
