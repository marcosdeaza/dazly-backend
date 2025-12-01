@echo off
cls
echo ========================================
echo   CONFIGURACION COMPLETA DE STRIPE
echo ========================================
echo.

cd /d "%~dp0"

echo [1/3] Instalando Stripe...
call npm install stripe
if errorlevel 1 (
    echo.
    echo ERROR: No se pudo instalar Stripe
    pause
    exit /b 1
)

echo.
echo [2/3] Verificando configuracion .env...
findstr /C:"sk_live_51SZDzz2XPI0pbbg7" .env >nul
if errorlevel 1 (
    echo ERROR: Claves de Stripe no configuradas en .env
    pause
    exit /b 1
)

echo.
echo [3/3] Verificando Price IDs...
findstr /C:"price_1SZEf92XPI0pbbg78fIsHDdt" .env >nul
if errorlevel 1 (
    echo ERROR: Price IDs no configurados en .env
    pause
    exit /b 1
)

echo.
echo ========================================
echo   STRIPE CONFIGURADO AL 100%%
echo ========================================
echo.
echo Configuracion completa:
echo   - Stripe instalado
echo   - Claves LIVE configuradas
echo   - Price IDs configurados
echo.
echo Siguiente paso:
echo   npm start
echo.
echo Entonces podras:
echo   - Comprar planes con Stripe
echo   - Procesar pagos reales
echo   - Webhooks configurados
echo.
pause
