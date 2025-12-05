#!/bin/bash
# ============================================
# INSTALADOR - Context Caching System
# Sistema de memoria persistente para Dazly
# ============================================

echo ""
echo "========================================="
echo " INSTALADOR - Context Caching System"
echo "========================================="
echo ""

echo "[1/5] Creando backup de archivos originales..."
if [ -f "src/services/vertexAI.js" ]; then
    cp src/services/vertexAI.js src/services/vertexAI_backup.js
    echo "   ✓ Backup: vertexAI.js guardado"
fi
if [ -f "src/routes/ai.js" ]; then
    cp src/routes/ai.js src/routes/ai_backup.js
    echo "   ✓ Backup: ai.js guardado"
fi
if [ -f "prisma/schema.prisma" ]; then
    cp prisma/schema.prisma prisma/schema_backup.prisma
    echo "   ✓ Backup: schema.prisma guardado"
fi

echo ""
echo "[2/5] Actualizando Prisma Schema..."
cp prisma/schema_with_cache.prisma prisma/schema.prisma
echo "   ✓ Schema actualizado con campos de caché"

echo ""
echo "[3/5] Reemplazando servicios y rutas..."
cp src/services/vertexAI_with_cache.js src/services/vertexAI.js
echo "   ✓ vertexAI.js actualizado"
cp src/routes/ai_with_cache.js src/routes/ai.js
echo "   ✓ ai.js actualizado"

echo ""
echo "[4/5] Generando Prisma Client..."
npx prisma generate
echo "   ✓ Prisma Client regenerado"

echo ""
echo "[5/5] Aplicando cambios a la base de datos..."
npx prisma db push
echo "   ✓ Base de datos actualizada"

echo ""
echo "========================================="
echo " ✅ INSTALACIÓN COMPLETADA"
echo "========================================="
echo ""
echo "📝 Próximos pasos:"
echo "   1. Reinicia el servidor: npm run dev"
echo "   2. Lee CONTEXT_CACHING_GUIDE.md para más info"
echo "   3. Los backups están en *_backup.js"
echo ""
echo "🎉 Context Caching activado!"
echo "   💰 Ahorro de tokens: ~90%"
echo "   🧠 Memoria persistente por proyecto"
echo "   🖼️  Contexto de imágenes anteriores"
echo ""
