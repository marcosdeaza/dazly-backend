// test-plan-memory.js
// Script para probar el sistema de memoria de planes

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:8081';

// Colores para consola
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

async function testPlanMemory() {
  console.log('\n' + '='.repeat(60));
  log('🧪', 'INICIANDO TEST DE MEMORIA DE PLANES', colors.cyan);
  console.log('='.repeat(60) + '\n');

  let token = null;
  const testEmail = `test-plan-${Date.now()}@dazly.test`;
  const testPassword = 'TestPassword123!';

  try {
    // ========================================
    // TEST 1: Crear usuario de prueba
    // ========================================
    log('1️⃣', 'TEST 1: Crear usuario de prueba', colors.blue);
    
    const registerResponse = await axios.post(`${API_URL}/api/auth/register`, {
      email: testEmail,
      password: testPassword
    });

    if (registerResponse.data.token) {
      token = registerResponse.data.token;
      log('✅', `Usuario creado: ${testEmail}`, colors.green);
      log('📊', `Plan inicial: ${registerResponse.data.user.plan}`, colors.cyan);
      log('💳', `Créditos: ${registerResponse.data.user.imagesRemaining}`, colors.cyan);
    } else {
      throw new Error('No se recibió token');
    }

    // ========================================
    // TEST 2: Verificar plan inicial (Free)
    // ========================================
    log('\n2️⃣', 'TEST 2: Verificar plan inicial', colors.blue);
    
    const profileResponse = await axios.get(`${API_URL}/api/user/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const user = profileResponse.data.user;
    if (user.plan === 'free' && user.imagesRemaining === 0) {
      log('✅', 'Plan inicial correcto: Free con 0 créditos', colors.green);
    } else {
      throw new Error(`Plan incorrecto: ${user.plan}, Créditos: ${user.imagesRemaining}`);
    }

    // ========================================
    // TEST 3: Simular compra de plan
    // ========================================
    log('\n3️⃣', 'TEST 3: Simular compra de plan "Summit"', colors.blue);
    
    const updateResponse = await axios.post(`${API_URL}/api/user/update-subscription`, {
      plan: 'summit',
      credits: 500,
      subscriptionEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 días
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (updateResponse.data.success) {
      log('✅', 'Plan actualizado a Summit', colors.green);
      log('📊', `Plan: ${updateResponse.data.user.plan}`, colors.cyan);
      log('💳', `Créditos: ${updateResponse.data.user.imagesRemaining}`, colors.cyan);
    } else {
      throw new Error('Error actualizando plan');
    }

    // ========================================
    // TEST 4: Sincronizar créditos (simula otro dispositivo)
    // ========================================
    log('\n4️⃣', 'TEST 4: Sincronizar créditos (multi-dispositivo)', colors.blue);
    
    const syncResponse = await axios.get(`${API_URL}/api/user/sync-credits`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const syncedCredits = syncResponse.data.credits;
    if (syncedCredits.plan === 'summit' && syncedCredits.imagesRemaining === 500) {
      log('✅', 'Sincronización correcta desde servidor', colors.green);
      log('📊', `Plan sincronizado: ${syncedCredits.plan}`, colors.cyan);
      log('💳', `Créditos sincronizados: ${syncedCredits.imagesRemaining}`, colors.cyan);
      log('🔄', `Estado: ${syncedCredits.subscriptionStatus}`, colors.cyan);
    } else {
      throw new Error('Sincronización incorrecta');
    }

    // ========================================
    // TEST 5: Simular uso de créditos
    // ========================================
    log('\n5️⃣', 'TEST 5: Simular uso de créditos', colors.blue);
    
    // Usar directamente Prisma para simular consumo
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const userId = registerResponse.data.user.id;
    await prisma.user.update({
      where: { id: userId },
      data: { imagesRemaining: 495 } // Simulamos que usó 5 créditos
    });

    const syncAfterUse = await axios.get(`${API_URL}/api/user/sync-credits`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (syncAfterUse.data.credits.imagesRemaining === 495) {
      log('✅', 'Consumo de créditos sincronizado correctamente', colors.green);
      log('💳', `Créditos restantes: ${syncAfterUse.data.credits.imagesRemaining}`, colors.cyan);
    } else {
      throw new Error('Error sincronizando consumo');
    }

    await prisma.$disconnect();

    // ========================================
    // TEST 6: Simular expiración de plan
    // ========================================
    log('\n6️⃣', 'TEST 6: Simular expiración de plan', colors.blue);
    
    const prisma2 = new PrismaClient();
    await prisma2.user.update({
      where: { id: userId },
      data: { 
        subscriptionEndDate: new Date(Date.now() - 24 * 60 * 60 * 1000) // Ayer
      }
    });

    const syncExpired = await axios.get(`${API_URL}/api/user/sync-credits`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (syncExpired.data.credits.plan === 'free' && syncExpired.data.credits.imagesRemaining === 0) {
      log('✅', 'Expiración automática funciona correctamente', colors.green);
      log('📊', `Plan después de expirar: ${syncExpired.data.credits.plan}`, colors.cyan);
      log('💳', `Créditos después de expirar: ${syncExpired.data.credits.imagesRemaining}`, colors.cyan);
    } else {
      throw new Error('Error en expiración automática');
    }

    await prisma2.$disconnect();

    // ========================================
    // RESUMEN FINAL
    // ========================================
    console.log('\n' + '='.repeat(60));
    log('🎉', 'TODOS LOS TESTS PASARON EXITOSAMENTE', colors.green);
    console.log('='.repeat(60));
    
    log('\n✅', 'Sistema de memoria de planes: FUNCIONAL', colors.green);
    log('✅', 'Sincronización multi-dispositivo: FUNCIONAL', colors.green);
    log('✅', 'Expiración automática: FUNCIONAL', colors.green);
    log('✅', 'Persistencia de créditos: FUNCIONAL', colors.green);

  } catch (error) {
    console.log('\n' + '='.repeat(60));
    log('❌', 'ERROR EN LOS TESTS', colors.red);
    console.log('='.repeat(60));
    console.error(error.response?.data || error.message);
    process.exit(1);
  }
}

// Ejecutar tests
testPlanMemory().catch(console.error);
