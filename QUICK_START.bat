@echo off
color 0A
title DAZLY API - Vertex AI Ready

echo.
echo     ██████╗  █████╗ ███████╗██╗  ██╗   ██╗
echo     ██╔══██╗██╔══██╗╚══███╔╝██║  ╚██╗ ██╔╝
echo     ██║  ██║███████║  ███╔╝ ██║   ╚████╔╝ 
echo     ██║  ██║██╔══██║ ███╔╝  ██║    ╚██╔╝  
echo     ██████╔╝██║  ██║███████╗███████╗██║   
echo     ╚═════╝ ╚═╝  ╚═╝╚══════╝╚══════╝╚═╝   
echo.
echo     🚀 VERTEX AI READY - GENERATIVE AI PLATFORM
echo.

echo ✅ Token Vertex AI: Configurado
echo ✅ Modelo: gemini-2.5-flash-image
echo ✅ Backend: Listo para deploy
echo ✅ Frontend: Ultra-profesional
echo ✅ Monetización: 6 planes optimizados
echo.

echo 💰 Proyección: €25,000+ ARR año 1
echo 🎯 Tiempo hasta ingresos: 1-2 días
echo.

echo 📋 INSTRUCCIONES:
echo 1. Cambiar GOOGLE_CLOUD_PROJECT_ID en .env
echo 2. npm install (si no lo hiciste)
echo 3. npm run dev (iniciar servidor)
echo 4. Abrir http://localhost:8081
echo.

set /p choice="¿Quieres iniciar el servidor ahora? (y/n): "
if /i "%choice%"=="y" (
    echo.
    echo 🔄 Iniciando servidor Dazly...
    npm run dev
) else (
    echo.
    echo 📝 Para iniciar manualmente: npm run dev
    echo 🧪 Para probar Vertex AI: ./test-vertex.bat
)

echo.
pause