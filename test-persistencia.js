// test-persistencia.js
// Script para probar que la persistencia funciona correctamente

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:8081';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(emoji, message, color = colors.reset) {
  console.log(`${color}${emoji} ${message}${colors.reset}`);
}

async function testPersistencia() {
  console.log('\n' + '='.repeat(60));
  log('🔍', 'TEST DE PERSISTENCIA - Plan y Créditos', colors.cyan);
  console.log('='.repeat(60) + '\n');

  let token = null;
  const testEmail = `persist-test-${Date.now()}@dazly.test`;
  const testPassword = 'TestPassword123!';

  try {
    // ========================================
    // PASO 1: Crear usuario
    // ========================================
    log('1️⃣', 'PASO 1: Registrar usuario', colors.blue);
    
    const registerResponse = await axios.post(`${API_URL}/api/auth/register`, {
      email: testEmail,
      password: testPassword
    });

    token = registerResponse.data.token;
    log('✅', `Usuario creado: ${testEmail}`, colors.green);
    log('🔑', `Token recibido: ${token.substring(0, 20)}...`, colors.cyan);

    // ========================================
    // PASO 2: Verificar perfil inicial
    // ========================================
    log('\n2️⃣', 'PASO 2: Verificar perfil inicial', colors.blue);
    
    const profile1 = await axios.get(`${API_URL}/api/user/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    log('📊', `Plan: ${profile1.data.user.plan}`, colors.cyan);
    log('💳', `Créditos: ${profile1.data.user.imagesRemaining}`, colors.cyan);
    log('🔄', `Estado: ${profile1.data.user.subscriptionStatus}`, colors.cyan);

    if (profile1.data.user.plan !== 'free') {
      throw new Error('Plan inicial debe ser Free');
    }

    // ========================================
    // PASO 3: Actualizar plan
    // ========================================
    log('\n3️⃣', 'PASO 3: Actualizar plan a Flow (200 créditos)', colors.blue);
    
    await axios.post(
      `${API_URL}/api/user/update-subscription`,
      {
        plan: 'flow',
        credits: 200,
        subscriptionEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    log('✅', 'Plan actualizado a Flow', colors.green);

    // ========================================
    // PASO 4: Verificar cambios (Simula recarga #1)
    // ========================================
    log('\n4️⃣', 'PASO 4: Verificar cambios (Simula recarga)', colors.blue);
    log('🔄', 'Simulando: Usuario recarga página...', colors.yellow);
    
    const profile2 = await axios.get(`${API_URL}/api/user/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    log('📊', `Plan después de recarga: ${profile2.data.user.plan}`, colors.cyan);
    log('💳', `Créditos después de recarga: ${profile2.data.user.imagesRemaining}`, colors.cyan);

    if (profile2.data.user.plan !== 'flow' || profile2.data.user.imagesRemaining !== 200) {
      throw new Error('❌ Los cambios NO se mantienen después de "recarga"');
    }

    log('✅', 'Cambios persistentes - CORRECTO', colors.green);

    // ========================================
    // PASO 5: Usar créditos
    // ========================================
    log('\n5️⃣', 'PASO 5: Simular uso de 5 créditos', colors.blue);
    
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const userId = registerResponse.data.user.id;
    await prisma.user.update({
      where: { id: userId },
      data: { imagesRemaining: 195 }
    });

    log('✅', 'Créditos actualizados: 200 → 195', colors.green);

    await prisma.$disconnect();

    // ========================================
    // PASO 6: Verificar créditos (Simula recarga #2)
    // ========================================
    log('\n6️⃣', 'PASO 6: Verificar créditos (Simula recarga)', colors.blue);
    log('🔄', 'Simulando: Usuario recarga página otra vez...', colors.yellow);
    
    const profile3 = await axios.get(`${API_URL}/api/user/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    log('💳', `Créditos después de segunda recarga: ${profile3.data.user.imagesRemaining}`, colors.cyan);

    if (profile3.data.user.imagesRemaining !== 195) {
      throw new Error('❌ Los créditos usados NO se mantienen');
    }

    log('✅', 'Créditos persistentes después de uso - CORRECTO', colors.green);

    // ========================================
    // PASO 7: Sincronización de créditos
    // ========================================
    log('\n7️⃣', 'PASO 7: Sincronizar créditos (endpoint específico)', colors.blue);
    
    const syncResponse = await axios.get(`${API_URL}/api/user/sync-credits`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    log('📊', `Plan sincronizado: ${syncResponse.data.credits.plan}`, colors.cyan);
    log('💳', `Créditos sincronizados: ${syncResponse.data.credits.imagesRemaining}`, colors.cyan);
    log('🔄', `Estado: ${syncResponse.data.credits.subscriptionStatus}`, colors.cyan);

    if (syncResponse.data.credits.imagesRemaining !== 195) {
      throw new Error('❌ La sincronización no devuelve créditos correctos');
    }

    log('✅', 'Sincronización funciona correctamente', colors.green);

    // ========================================
    // PASO 8: Verificar que subscriptionEndDate persiste
    // ========================================
    log('\n8️⃣', 'PASO 8: Verificar fechas de suscripción', colors.blue);
    
    if (profile3.data.user.subscriptionEndDate) {
      const endDate = new Date(profile3.data.user.subscriptionEndDate);
      log('📅', `Fecha de expiración: ${endDate.toLocaleDateString()}`, colors.cyan);
      log('✅', 'subscriptionEndDate persiste correctamente', colors.green);
    } else {
      log('⚠️', 'subscriptionEndDate no está presente', colors.yellow);
    }

    // ========================================
    // RESUMEN FINAL
    // ========================================
    console.log('\n' + '='.repeat(60));
    log('🎉', 'TODOS LOS TESTS DE PERSISTENCIA PASARON', colors.green);
    console.log('='.repeat(60));
    
    log('\n✅', 'Plan se mantiene después de recarga', colors.green);
    log('✅', 'Créditos se mantienen después de recarga', colors.green);
    log('✅', 'Cambios de créditos persisten', colors.green);
    log('✅', 'Sincronización funciona correctamente', colors.green);
    log('✅', 'Endpoint /profile devuelve todos los datos', colors.green);

    console.log('\n' + '='.repeat(60));
    log('🔒', 'SISTEMA DE PERSISTENCIA: FUNCIONAL', colors.green);
    console.log('='.repeat(60) + '\n');

    // Instrucciones para el usuario
    console.log('\n📋 INSTRUCCIONES PARA PROBAR EN EL FRONTEND:\n');
    log('1️⃣', 'Abre el frontend: http://localhost:5173', colors.cyan);
    log('2️⃣', 'Haz login con tu usuario', colors.cyan);
    log('3️⃣', 'Verifica que aparecen tu plan y créditos', colors.cyan);
    log('4️⃣', 'Recarga la página (F5)', colors.cyan);
    log('5️⃣', 'Verifica que plan y créditos se mantienen', colors.cyan);
    log('6️⃣', 'Abre DevTools Console y busca:', colors.cyan);
    console.log('     - "🔄 Restaurando sesión desde token..."');
    console.log('     - "✅ Sesión restaurada exitosamente"');
    console.log('     - "🔄 Créditos sincronizados del servidor"');
    console.log('\n');

  } catch (error) {
    console.log('\n' + '='.repeat(60));
    log('❌', 'ERROR EN LOS TESTS DE PERSISTENCIA', colors.red);
    console.log('='.repeat(60));
    console.error('\n📋 Detalles del error:');
    console.error(error.response?.data || error.message);
    console.error('\n🔍 Stack trace:');
    console.error(error.stack);
    process.exit(1);
  }
}

// Ejecutar tests
console.log('\n🚀 Iniciando tests de persistencia...\n');
testPersistencia().catch(console.error);
