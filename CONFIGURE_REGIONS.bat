@echo off
echo ========================================
echo   CONFIGURACION DE REGIONES OPTIMIZADA
echo ========================================
echo.
echo Este script te ayuda a configurar las regiones
echo de Vertex AI para maxima velocidad y capacidad.
echo.
echo REGIONES RECOMENDADAS (ya configuradas en el codigo):
echo.
echo 1. us-central1       [PRINCIPAL - Mas cuota, mejor latencia]
echo 2. us-east4          [RESPALDO 1 - USA Este]
echo 3. europe-west4      [RESPALDO 2 - Europa]
echo 4. asia-southeast1   [RESPALDO 3 - Asia]
echo.
echo ========================================
echo   INFORMACION IMPORTANTE
echo ========================================
echo.
echo Tu archivo .env deberia tener:
echo   VERTEX_AI_LOCATION="us-central1"
echo.
echo NOTA: El sistema optimizado usa las 4 regiones
echo automaticamente, pero usa VERTEX_AI_LOCATION
echo como region preferida inicial.
echo.
echo ========================================
echo   CAMBIAR REGION PRINCIPAL
echo ========================================
echo.
echo Elige la region principal (la que se probara primero):
echo.
echo 1) us-central1       (Recomendado - Mas capacidad)
echo 2) us-east4          (USA Este)
echo 3) europe-west4      (Europa - Mejor si tu servidor esta en Europa)
echo 4) asia-southeast1   (Asia)
echo 5) No cambiar
echo.
set /p choice="Selecciona (1-5): "

if "%choice%"=="1" (
    set REGION=us-central1
    goto :setregion
)
if "%choice%"=="2" (
    set REGION=us-east4
    goto :setregion
)
if "%choice%"=="3" (
    set REGION=europe-west4
    goto :setregion
)
if "%choice%"=="4" (
    set REGION=asia-southeast1
    goto :setregion
)
if "%choice%"=="5" (
    echo No se realizaron cambios.
    goto :end
)

echo Opcion invalida.
goto :end

:setregion
echo.
echo Configurando region principal: %REGION%
echo.

REM Crear backup del .env
if exist ".env" (
    copy .env .env.backup.%date:~-4%%date:~3,2%%date:~0,2%
    echo [OK] Backup de .env creado
)

REM Actualizar .env (esto es un ejemplo simple)
echo.
echo NOTA: Debes editar manualmente el archivo .env
echo y cambiar la linea:
echo.
echo   VERTEX_AI_LOCATION="%REGION%"
echo.
echo ========================================
echo   CONFIGURACION AVANZADA
echo ========================================
echo.
echo Si quieres ajustar mas parametros, edita:
echo   src\services\vertexAI_optimized.js
echo.
echo Parametros ajustables:
echo   - maxConcurrentRequests (default: 3)
echo   - regions (array de regiones)
echo   - cacheExpiration (default: 5 minutos)
echo   - rateLimiter.tokens (default: 10)
echo   - rateLimiter.refillRate (default: 2/s)
echo.

:end
echo ========================================
echo   RECOMENDACIONES FINALES
echo ========================================
echo.
echo Para MAXIMA velocidad y capacidad:
echo.
echo 1. Usa us-central1 como region principal
echo    (mas cuota disponible)
echo.
echo 2. Si tu servidor esta en Europa:
echo    Usa europe-west4 como principal
echo    (menor latencia)
echo.
echo 3. El sistema rotara automaticamente
echo    entre las 4 regiones si hay problemas
echo.
echo 4. Monitorea el dashboard:
echo    http://localhost:8081/dashboard/stats-dashboard.html
echo.
pause
