@echo off
REM ============================================
REM INSTALADOR - Sistema de Edici?n Visual
REM Memoria visual + Edici?n precisa de im?genes
REM ============================================

echo.
echo =========================================
echo  INSTALADOR - Sistema de Edicion Visual
echo =========================================
echo.

echo [1/4] Creando backup de archivos originales...
if exist src\routes\ai.js (
    copy src\routes\ai.js src\routes\ai_backup_before_visual.js
    echo    ^> Backup: ai.js guardado
)
if exist prisma\schema.prisma (
    copy prisma\schema.prisma prisma\schema_backup_before_visual.prisma
    echo    ^> Backup: schema.prisma guardado
)

echo.
echo [2/4] Actualizando Prisma Schema...
echo.
echo Agrega estos campos al modelo Project en prisma/schema.prisma:
echo.
echo   visualCacheId  String?   // ID del cache visual en Gemini
echo   cacheExpiry    DateTime? // Cuando expira el cache
echo.
pause
echo.
echo Ejecutando npx prisma generate...
call npx prisma generate
echo.
echo Ejecutando npx prisma db push...
call npx prisma db push

echo.
echo [3/4] Activando nuevas rutas...
copy src\routes\ai_with_visual_memory.js src\routes\ai.js
echo    ^> ai.js actualizado con memoria visual

echo.
echo [4/4] Verificando servicios...
if exist src\services\imageEditor.js (
    echo    ^> imageEditor.js encontrado
) else (
    echo    X imageEditor.js NO encontrado
    echo      Por favor verifica que el archivo exista
)

echo.
echo =========================================
echo  INSTALACION COMPLETADA
echo =========================================
echo.
echo Proximos pasos:
echo   1. Reinicia el servidor: npm run dev
echo   2. Actualiza el frontend para usar editMode
echo   3. Lee README_VISUAL_MEMORY_EDITING.md
echo.
echo Funcionalidades activadas:
echo   - Memoria visual (recuerda 10 imagenes)
echo   - Edicion precisa de imagenes
echo   - Compresion automatica (sin failed to fetch)
echo   - Context caching con imagenes
echo.
pause
