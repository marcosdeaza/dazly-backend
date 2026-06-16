@echo off
echo ========================================
echo    VERIFICACION PRE-DEPLOY RAILWAY
echo ========================================
echo.

echo [1/5] Verificando archivos de configuracion...
if exist "railway.json" (
    echo   ✓ railway.json encontrado
) else (
    echo   ✗ railway.json NO encontrado
)

if exist "Procfile" (
    echo   ✓ Procfile encontrado
) else (
    echo   ✗ Procfile NO encontrado
)

if exist "package.json" (
    echo   ✓ package.json encontrado
) else (
    echo   ✗ package.json NO encontrado
)

if exist "tsconfig.json" (
    echo   ✓ tsconfig.json encontrado
) else (
    echo   ✗ tsconfig.json NO encontrado
)

if exist "prisma\schema.prisma" (
    echo   ✓ prisma/schema.prisma encontrado
) else (
    echo   ✗ prisma/schema.prisma NO encontrado
)

echo.
echo [2/5] Verificando .env.example...
if exist ".env.example" (
    echo   ✓ .env.example existe
    findstr /C:"DATABASE_URL" .env.example >nul
    if %errorlevel%==0 (echo   ✓ DATABASE_URL definido)
    findstr /C:"JWT_SECRET" .env.example >nul
    if %errorlevel%==0 (echo   ✓ JWT_SECRET definido)
    findstr /C:"GOOGLE_CLOUD_PROJECT_ID" .env.example >nul
    if %errorlevel%==0 (echo   ✓ GOOGLE_CLOUD_PROJECT_ID definido)
) else (
    echo   ✗ .env.example NO existe
)

echo.
echo [3/5] Verificando scripts en package.json...
findstr /C:"\"start\"" package.json >nul
if %errorlevel%==0 (
    echo   ✓ Script 'start' definido
)
findstr /C:"\"build\"" package.json >nul
if %errorlevel%==0 (
    echo   ✓ Script 'build' definido
)
findstr /C:"\"postinstall\"" package.json >nul
if %errorlevel%==0 (
    echo   ✓ Script 'postinstall' definido
)

echo.
echo [4/5] Verificando dependencias criticas...
findstr /C:"@prisma/client" package.json >nul
if %errorlevel%==0 (
    echo   ✓ @prisma/client en dependencies
)
findstr /C:"stripe" package.json >nul
if %errorlevel%==0 (
    echo   ✓ stripe en dependencies
)
findstr /C:"express" package.json >nul
if %errorlevel%==0 (
    echo   ✓ express en dependencies
)
findstr /C:"typescript" package.json >nul
if %errorlevel%==0 (
    echo   ✓ typescript en dependencies
)

echo.
echo [5/5] Intentando compilar TypeScript...
echo   Ejecutando: npm run build
call npm run build
if %errorlevel%==0 (
    echo   ✓ Build exitoso - codigo compila correctamente
    if exist "dist\index.js" (
        echo   ✓ dist/index.js generado
    )
) else (
    echo   ✗ Build fallo - revisar errores arriba
)

echo.
echo ========================================
echo          RESUMEN DE VERIFICACION
echo ========================================
echo.
echo ✓ = Correcto   ✗ = Falta configurar
echo.
echo Si todos los checks son ✓, estas listo para:
echo   1. Configurar variables en Railway
echo   2. Agregar PostgreSQL
echo   3. Deploy desde GitHub
echo.
echo Ver FIX_RAILWAY_DEPLOY.md para instrucciones completas
echo.
pause
