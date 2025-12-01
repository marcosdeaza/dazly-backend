// TEST_OPTIMIZED.js
// Script para probar el sistema optimizado con múltiples peticiones simultáneas

const vertexAI = require('./src/services/vertexAI_optimized');

console.log('🚀 INICIANDO TEST DE SISTEMA OPTIMIZADO\n');
console.log('=========================================\n');

// Test 1: Peticiones simultáneas
async function testConcurrentRequests() {
  console.log('📊 TEST 1: 10 peticiones simultáneas');
  console.log('Esto simula 10 usuarios haciendo preguntas al mismo tiempo\n');
  
  const prompts = [
    '¿Qué es el diseño minimalista?',
    'Analiza la composición de un buen logo',
    'Dame tips para usar colores complementarios',
    'Explica la regla de los tercios',
    'Qué es el diseño flat design?',
    '¿Cómo elegir tipografía para un poster?',
    'Dame consejos de iluminación en fotografía',
    '¿Qué es el golden ratio?',
    'Explica la teoría del color',
    'Tips para diseñar un banner'
  ];
  
  const startTime = Date.now();
  
  try {
    // Lanzar todas las peticiones a la vez
    const promises = prompts.map((prompt, index) => {
      return vertexAI.generateChatResponse(prompt, {})
        .then(response => {
          console.log(`✅ Petición ${index + 1} completada: "${prompt.slice(0, 30)}..."`);
          return { index, success: true, text: response.text.slice(0, 100) };
        })
        .catch(error => {
          console.log(`❌ Petición ${index + 1} falló: ${error.message}`);
          return { index, success: false, error: error.message };
        });
    });
    
    const results = await Promise.all(promises);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log('\n📈 RESULTADOS:');
    console.log(`   - Exitosas: ${successful}/${prompts.length} (${(successful/prompts.length*100).toFixed(1)}%)`);
    console.log(`   - Fallidas: ${failed}/${prompts.length}`);
    console.log(`   - Tiempo total: ${elapsed}s`);
    console.log(`   - Promedio: ${(elapsed/prompts.length).toFixed(2)}s por petición\n`);
    
  } catch (error) {
    console.error('❌ Error en test:', error.message);
  }
}

// Test 2: Cache
async function testCache() {
  console.log('\n📦 TEST 2: Sistema de caché');
  console.log('Haciendo la misma pregunta 3 veces...\n');
  
  const prompt = '¿Qué colores usar para un logo corporativo?';
  
  // Primera llamada (no cache)
  console.log('1️⃣ Primera llamada (sin caché)...');
  const start1 = Date.now();
  await vertexAI.generateChatResponse(prompt, {});
  const time1 = Date.now() - start1;
  console.log(`   ⏱️ Tiempo: ${time1}ms\n`);
  
  // Segunda llamada (con cache)
  console.log('2️⃣ Segunda llamada (CON caché)...');
  const start2 = Date.now();
  await vertexAI.generateChatResponse(prompt, {});
  const time2 = Date.now() - start2;
  console.log(`   ⏱️ Tiempo: ${time2}ms`);
  console.log(`   🚀 Aceleración: ${(time1/time2).toFixed(1)}x más rápido\n`);
  
  // Tercera llamada (con cache)
  console.log('3️⃣ Tercera llamada (CON caché)...');
  const start3 = Date.now();
  await vertexAI.generateChatResponse(prompt, {});
  const time3 = Date.now() - start3;
  console.log(`   ⏱️ Tiempo: ${time3}ms\n`);
}

// Test 3: Estadísticas
function testStats() {
  console.log('\n📊 TEST 3: Estadísticas del sistema');
  const stats = vertexAI.getStats();
  
  console.log('\n🌍 REGIONES:');
  Object.entries(stats.regions).forEach(([region, data]) => {
    const status = data.cooldownUntil > Date.now() ? '🔴 COOLDOWN' : '🟢 ACTIVA';
    console.log(`   ${region}: ${status}`);
    console.log(`      Peticiones: ${data.requests}`);
    console.log(`      Errores: ${data.errors}`);
  });
  
  console.log('\n📋 COLA:');
  console.log(`   Pendientes: ${stats.queue.pending}`);
  console.log(`   Activas: ${stats.queue.active}/${stats.queue.max}`);
  
  console.log('\n🎫 RATE LIMITER:');
  console.log(`   Tokens disponibles: ${stats.rateLimiter.tokens}/${stats.rateLimiter.maxTokens}`);
  
  console.log('\n💾 CACHÉ:');
  console.log(`   Entradas: ${stats.cache.size}/${stats.cache.maxSize}`);
  console.log('');
}

// Ejecutar todos los tests
async function runAllTests() {
  try {
    // Test 1: Peticiones simultáneas
    await testConcurrentRequests();
    
    // Esperar un poco
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 2: Cache
    await testCache();
    
    // Test 3: Stats
    testStats();
    
    console.log('=========================================');
    console.log('✅ TODOS LOS TESTS COMPLETADOS');
    console.log('=========================================\n');
    
  } catch (error) {
    console.error('❌ Error ejecutando tests:', error);
  }
}

// Ejecutar
runAllTests();
