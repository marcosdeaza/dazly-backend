@echo off
echo ========================================
echo   TEST BUILD LOCAL - Verificar Errores
echo ========================================
echo.

echo [1/3] Limpiando build anterior...
if exist "dist" rmdir /s /q dist
echo   ✓ Limpiado

echo.
echo [2/3] Instalando dependencias...
call npm install
if %errorlevel% neq 0 (
    echo   ✗ Error en npm install
    pause
    exit /b 1
)
echo   ✓ Dependencias instaladas

echo.
echo [3/3] Compilando TypeScript...
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo   ✗ BUILD FALLO - Revisar errores arriba
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo          BUILD EXITOSO! 
echo ========================================
echo.
echo ✅ TypeScript compilado correctamente
echo ✅ Prisma Client generado
echo ✅ Archivos en carpeta dist/
echo.
echo Ahora puedes:
echo   1. git add .
echo   2. git commit -m "Fix Railway deploy"
echo   3. git push
echo.
echo Railway hara el mismo build y deberia funcionar.
echo.
pause
