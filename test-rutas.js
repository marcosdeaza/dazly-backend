// test-rutas.js - Verificar que las rutas se cargan correctamente

console.log('🔍 Verificando rutas...\n');

try {
  console.log('1️⃣ Cargando ruta AI...');
  const aiRoutes = require('./src/routes/ai');
  console.log('✅ Ruta AI cargada correctamente');
  console.log('   Tipo:', typeof aiRoutes);
  console.log('   Es función:', typeof aiRoutes === 'function');
  console.log('');
  
  console.log('2️⃣ Cargando ruta Projects...');
  const projectsRoutes = require('./src/routes/projects');
  console.log('✅ Ruta Projects cargada correctamente');
  console.log('   Tipo:', typeof projectsRoutes);
  console.log('');
  
  console.log('3️⃣ Cargando ruta User...');
  const userRoutes = require('./src/routes/user');
  console.log('✅ Ruta User cargada correctamente');
  console.log('   Tipo:', typeof userRoutes);
  console.log('');
  
  console.log('✅ TODAS LAS RUTAS SE PUEDEN CARGAR\n');
  console.log('Si npm start falla, el problema es otro.\n');
  
} catch (error) {
  console.error('❌ ERROR AL CARGAR RUTAS:');
  console.error(error.message);
  console.error('\nStack trace:');
  console.error(error.stack);
  console.error('\n❌ Este es el problema que impide que el servidor funcione.\n');
}
