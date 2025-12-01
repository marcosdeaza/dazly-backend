@echo off
echo ========================================
echo   CAMBIAR A VERTEX AI OPTIMIZADO
echo ========================================
echo.
echo Este script cambia al servicio optimizado con:
echo   - Sistema de colas (max 3 peticiones simultaneas)
echo   - Rotacion de 4 regiones (us-central1, us-east4, europe-west4, asia-southeast1)
echo   - Cache de respuestas (5 minutos)
echo   - Rate limiter inteligente (10 tokens, refill 2/segundo)
echo   - Cooldown automatico en regiones con 429
echo.

echo Haciendo backup del servicio actual...
copy src\services\vertexAI.js src\services\vertexAI_backup_%date:~-4%%date:~3,2%%date:~0,2%.js

echo.
echo Cambiando a servicio optimizado...
copy src\services\vertexAI_optimized.js src\services\vertexAI.js

echo.
echo ========================================
echo   COMPLETADO
echo ========================================
echo.
echo El servicio optimizado esta ahora activo.
echo.
echo CONFIGURACION ACTUAL:
echo   - Max peticiones simultaneas: 3
echo   - Regiones: 4 (rotacion automatica)
echo   - Cache: 5 minutos
echo   - Rate limiter: 10 tokens, refill 2/s
echo.
echo Para volver al servicio anterior:
echo   copy src\services\vertexAI_backup_*.js src\services\vertexAI.js
echo.
echo Reinicia el servidor para aplicar cambios:
echo   npm start
echo.
pause
