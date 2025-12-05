@echo off
echo ========================================
echo   VERIFICACION DE CONFIGURACION
echo ========================================
echo.

echo Verificando archivos necesarios...
echo.

set ERROR=0

if exist "src\services\vertexAI_optimized.js" (
    echo [OK] vertexAI_optimized.js encontrado
) else (
    echo [ERROR] vertexAI_optimized.js NO encontrado
    set ERROR=1
)

if exist "public\stats-dashboard.html" (
    echo [OK] stats-dashboard.html encontrado
) else (
    echo [ERROR] stats-dashboard.html NO encontrado
    set ERROR=1
)

if exist "TEST_OPTIMIZED.js" (
    echo [OK] TEST_OPTIMIZED.js encontrado
) else (
    echo [ERROR] TEST_OPTIMIZED.js NO encontrado
    set ERROR=1
)

if exist "SWITCH_TO_OPTIMIZED.bat" (
    echo [OK] SWITCH_TO_OPTIMIZED.bat encontrado
) else (
    echo [ERROR] SWITCH_TO_OPTIMIZED.bat NO encontrado
    set ERROR=1
)

echo.
echo ========================================
echo   ESTADO DEL SERVICIO
echo ========================================
echo.

findstr /C:"class VertexAIOptimized" src\services\vertexAI.js >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Sistema OPTIMIZADO activo
    echo.
    echo Tu sistema esta usando la version optimizada con:
    echo   - 4 regiones ^(us-central1, us-east4, europe-west4, asia-southeast1^)
    echo   - Sistema de colas ^(max 3 simultaneas^)
    echo   - Cache de respuestas ^(5 minutos^)
    echo   - Rate limiter inteligente
    echo.
) else (
    echo [ADVERTENCIA] Sistema NO optimizado
    echo.
    echo Ejecuta SWITCH_TO_OPTIMIZED.bat para activar:
    echo   - Multi-region ^(4x capacidad^)
    echo   - Sistema de colas
    echo   - Cache automatico
    echo   - Rate limiter
    echo.
)

echo ========================================
echo   PROXIMOS PASOS
echo ========================================
echo.

if %ERROR% EQU 1 (
    echo [ERROR] Faltan archivos necesarios
    echo Por favor verifica que todos los archivos se crearon correctamente.
    echo.
) else (
    findstr /C:"class VertexAIOptimized" src\services\vertexAI.js >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo Todo listo! Para monitorear el sistema:
        echo.
        echo 1. Inicia el servidor:
        echo    npm start
        echo.
        echo 2. Abre el dashboard:
        echo    http://localhost:8081/dashboard/stats-dashboard.html
        echo.
        echo 3. Prueba el sistema:
        echo    node TEST_OPTIMIZED.js
        echo.
    ) else (
        echo Para activar el sistema optimizado:
        echo.
        echo 1. Ejecuta:
        echo    SWITCH_TO_OPTIMIZED.bat
        echo.
        echo 2. Reinicia el servidor:
        echo    npm start
        echo.
        echo 3. Verifica el dashboard:
        echo    http://localhost:8081/dashboard/stats-dashboard.html
        echo.
    )
)

echo ========================================
pause
