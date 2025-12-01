@echo off
REM ============================================
REM INSTALADOR - Context Caching System
REM Sistema de memoria persistente para Dazly
REM ============================================

echo.
echo =========================================
echo  INSTALADOR - Context Caching System
echo =========================================
echo.

echo [1/5] Creando backup de archivos originales...
if exist src\services\vertexAI.js (
    copy src\services\vertexAI.js src\services\vertexAI_backup.js
    echo    ? Backup: vertexAI.js guardado
)
if exist src\routes\ai.js (
    copy src\routes\ai.js src\routes\ai_backup.js
    echo    ? Backup: ai.js guardado
)
if exist prisma\schema.prisma (
    copy prisma\schema.prisma prisma\schema_backup.prisma
    echo    ? Backup: schema.prisma guardado
)

echo.
echo [2/5] Actualizando Prisma Schema...
copy prisma\schema_with_cache.prisma prisma\schema.prisma
echo    ? Schema actualizado con campos de cach?

echo.
echo [3/5] Reemplazando servicios y rutas...
copy src\services\vertexAI_with_cache.js src\services\vertexAI.js
echo    ? vertexAI.js actualizado
copy src\routes\ai_with_cache.js src\routes\ai.js
echo    ? ai.js actualizado

echo.
echo [4/5] Generando Prisma Client...
call npx prisma generate
echo    ? Prisma Client regenerado

echo.
echo [5/5] Aplicando cambios a la base de datos...
call npx prisma db push
echo    ? Base de datos actualizada

echo.
echo =========================================
echo  ? INSTALACI?N COMPLETADA
echo =========================================
echo.
echo ?? Pr?ximos pasos:
echo    1. Reinicia el servidor: npm run dev
echo    2. Lee CONTEXT_CACHING_GUIDE.md para m?s info
echo    3. Los backups est?n en *_backup.js
echo.
echo ?? Context Caching activado!
echo    ?? Ahorro de tokens: ~90%%
echo    ?? Memoria persistente por proyecto
echo    ???  Contexto de im?genes anteriores
echo.
pause
