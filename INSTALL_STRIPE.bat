@echo off
echo ========================================
echo INSTALANDO STRIPE EN BACKEND
echo ========================================
echo.

cd /d "%~dp0"

echo Instalando stripe...
call npm install stripe

echo.
echo ========================================
echo STRIPE INSTALADO
echo ========================================
echo.
echo Siguiente paso:
echo 1. Crear cuenta en https://stripe.com
echo 2. Crear productos en Dashboard
echo 3. Copiar claves y Price IDs al .env
echo 4. Ejecutar: npm start
echo.
pause
