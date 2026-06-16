@echo off
echo 🔧 Instalando Google Auth Library...
echo.

cd dazly-api
npm install google-auth-library@^9.0.0

if %errorlevel% equ 0 (
    echo.
    echo ✅ Google Auth Library instalada correctamente
    echo ✅ Ruta /api/auth/google ahora disponible
    echo.
    echo 📋 Próximos pasos:
    echo 1. Reiniciar el servidor backend
    echo 2. Probar login con Google
    echo.
) else (
    echo.
    echo ❌ Error instalando dependencia
    echo.
)

pause