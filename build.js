// build.js - Script de build personalizado para Railway
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔨 Iniciando build...');

try {
  // 1. Generar Prisma Client
  console.log('📦 Generando Prisma Client...');
  execSync('npx prisma generate', { stdio: 'inherit' });

  // 2. Compilar TypeScript (solo archivos .ts)
  console.log('⚙️  Compilando TypeScript...');
  // Usar tsc normalmente - tsconfig.json ya excluye los .js
  execSync('tsc', { stdio: 'inherit' });

  // 3. Copiar archivos .js de services/
  console.log('📋 Copiando servicios JavaScript...');
  const servicesDir = path.join(__dirname, 'src', 'services');
  const distServicesDir = path.join(__dirname, 'dist', 'services');

  // Crear directorio si no existe
  if (!fs.existsSync(distServicesDir)) {
    fs.mkdirSync(distServicesDir, { recursive: true });
  }

  // Copiar cada archivo .js
  const jsFiles = ['vertexAI.js', 'visualMemory.js', 'imageEditor.js'];
  jsFiles.forEach(file => {
    const src = path.join(servicesDir, file);
    const dest = path.join(distServicesDir, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      console.log(`  ✅ Copiado ${file}`);
    } else {
      console.warn(`  ⚠️  ${file} no encontrado`);
    }
  });

  console.log('✅ Build completado exitosamente!');
  process.exit(0);
} catch (error) {
  console.error('❌ Error en el build:', error.message);
  process.exit(1);
}
