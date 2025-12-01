@echo off
echo ========================================
echo  REINICIO LIMPIO DEL SERVIDOR
echo ========================================
echo.

echo [1/4] Deteniendo procesos Node.js...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 >nul

echo [2/4] Limpiando cache de ts-node...
if exist "node_modules\.cache" rmdir /s /q "node_modules\.cache"
if exist "dist" rmdir /s /q "dist"

echo [3/4] Verificando archivo index.ts...
findstr /C:"const promptWantsImage" src\index.ts >nul
if %ERRORLEVEL% EQU 0 (
    echo ✅ Variable promptWantsImage encontrada
) else (
    echo ❌ ERROR: Variable promptWantsImage NO encontrada
    pause
    exit /b 1
)

echo [4/4] Iniciando servidor...
echo.
npm start
