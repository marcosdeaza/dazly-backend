@echo off
echo 🚀 Instalando dependencias de Dazly API...
echo.

npm install
if %errorlevel% neq 0 (
    echo ❌ Error instalando dependencias
    pause
    exit /b 1
)

echo.
echo ✅ Dependencias instaladas correctamente
echo.
echo 📋 Próximos pasos:
echo 1. Configura tu GOOGLE_CLOUD_PROJECT_ID en .env
echo 2. Ejecuta: npm run dev
echo 3. Prueba: node src/scripts/test-vertex.js
echo.
pause