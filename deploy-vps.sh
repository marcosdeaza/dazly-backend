#!/bin/bash

# 🚀 Dazly API - VPS Deployment Script
# Este script configura todo lo necesario en un VPS Ubuntu/Debian

set -e  # Salir si hay algún error

echo "🚀 Dazly API - Script de Deployment en VPS"
echo "==========================================="
echo ""

# Verificar que se está ejecutando como root o con sudo
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Por favor ejecuta este script con sudo"
    exit 1
fi

# Actualizar sistema
echo "📦 Actualizando sistema..."
apt-get update
apt-get upgrade -y

# Instalar Node.js 18.x
echo "📦 Instalando Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Instalar PM2
echo "📦 Instalando PM2..."
npm install -g pm2

# Instalar PostgreSQL
echo "📦 Instalando PostgreSQL..."
apt-get install -y postgresql postgresql-contrib

# Configurar PostgreSQL
echo "🗄️  Configurando PostgreSQL..."
sudo -u postgres psql -c "CREATE DATABASE dazly_production;" 2>/dev/null || echo "Base de datos ya existe"
sudo -u postgres psql -c "CREATE USER dazly_user WITH PASSWORD 'cambiar_esta_password';" 2>/dev/null || echo "Usuario ya existe"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE dazly_production TO dazly_user;"

# Instalar Nginx
echo "📦 Instalando Nginx..."
apt-get install -y nginx

# Instalar Certbot para SSL
echo "📦 Instalando Certbot..."
apt-get install -y certbot python3-certbot-nginx

# Configurar firewall
echo "🔒 Configurando firewall..."
ufw allow 22
ufw allow 80
ufw allow 443
ufw --force enable

echo ""
echo "✅ Sistema configurado exitosamente!"
echo ""
echo "📝 Próximos pasos manuales:"
echo ""
echo "1. Clonar tu repositorio:"
echo "   git clone tu-repositorio.git /var/www/dazly-api"
echo ""
echo "2. Editar configuración de Nginx:"
echo "   nano /etc/nginx/sites-available/dazly-api"
echo ""
echo "3. Configurar variables de entorno:"
echo "   cd /var/www/dazly-api"
echo "   nano .env"
echo ""
echo "4. Iniciar aplicación:"
echo "   ./start-production.sh"
echo ""
echo "5. Configurar SSL:"
echo "   certbot --nginx -d api.tudominio.com"
echo ""

# Crear directorio para la app
mkdir -p /var/www/dazly-api

echo "✅ VPS listo para deployment!"
