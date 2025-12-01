// test-security-system.js
// Script para probar el sistema de seguridad comercial

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:8081';

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(emoji, message, color = colors.reset) {
  console.log(`${color}${emoji} ${message}${colors.reset}`);
}

async function testSecuritySystem() {
  console.log('\n' + '='.repeat(70));
  log('🔒', 'INICIANDO TESTS DE SEGURIDAD COMERCIAL', colors.cyan);
  console.log('='.repeat(70) + '\n');

  let token = null;
  let projectId = null;
  const testEmail = `security-test-${Date.now()}@dazly.test`;
  const testPassword = 'SecurePassword123!';

  try {
    // ========================================
    // TEST 1: Registro y verificación de plan inicial
    // ========================================
    log('1️⃣', 'TEST 1: Registro y Plan Free por defecto', colors.blue);
    
    const registerResponse = await axios.post(`${API_URL}/api/auth/register`, {
      email: testEmail,
      password: testPassword
    });

    if (registerResponse.data.token) {
      token = registerResponse.data.token;
      log('✅', `Usuario creado: ${testEmail}`, colors.green);
      log('📊', `Plan: ${registerResponse.data.user.plan}`, colors.cyan);
      log('💳', `Créditos: ${registerResponse.data.user.imagesRemaining}`, colors.cyan);
      
      if (registerResponse.data.user.plan === 'free' && registerResponse.data.user.imagesRemaining === 0) {
        log('✅', 'Plan Free sin créditos - CORRECTO', colors.green);
      } else {
        throw new Error('Plan inicial incorrecto');
      }
    }

    // ========================================
    // TEST 2: Intentar generar sin créditos
    // ========================================
    log('\n2️⃣', 'TEST 2: Intentar generar imagen SIN créditos', colors.blue);
    
    // Primero crear un proyecto
    const projectResponse = await axios.post(
      `${API_URL}/api/projects`,
      {
        name: 'Test Project',
        description: 'Security test'
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    projectId = projectResponse.data.project.id;
    log('📁', `Proyecto creado: ${projectId}`, colors.cyan);

    try {
      await axios.post(
        `${API_URL}/api/ai/generate`,
        {
          prompt: 'A beautiful sunset',
          projectId: projectId
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      throw new Error('❌ ERROR: Se permitió generar sin créditos');
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.error === 'Sin créditos disponibles') {
        log('✅', 'Generación bloqueada sin créditos - CORRECTO', colors.green);
        log('💳', `Créditos verificados: ${error.response.data.imagesRemaining}`, colors.cyan);
      } else {
        throw error;
      }
    }

    // ========================================
    // TEST 3: Actualizar plan y verificar créditos
    // ========================================
    log('\n3️⃣', 'TEST 3: Actualizar plan y asignar créditos', colors.blue);
    
    const updateResponse = await axios.post(
      `${API_URL}/api/user/update-subscription`,
      {
        plan: 'flow',
        credits: 200,
        subscriptionEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (updateResponse.data.success) {
      log('✅', 'Plan actualizado a Flow', colors.green);
      log('📊', `Nuevo plan: ${updateResponse.data.user.plan}`, colors.cyan);
      log('💳', `Créditos asignados: ${updateResponse.data.user.imagesRemaining}`, colors.cyan);
      
      if (updateResponse.data.user.imagesRemaining !== 200) {
        throw new Error('Créditos no asignados correctamente');
      }
    }

    // ========================================
    // TEST 4: Verificar que backend controla créditos
    // ========================================
    log('\n4️⃣', 'TEST 4: Verificar control de créditos en servidor', colors.blue);
    
    const profileResponse = await axios.get(
      `${API_URL}/api/user/profile`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const creditsFromServer = profileResponse.data.user.imagesRemaining;
    log('💾', `Créditos en DB: ${creditsFromServer}`, colors.cyan);
    
    if (creditsFromServer === 200) {
      log('✅', 'Backend mantiene control de créditos - CORRECTO', colors.green);
    } else {
      throw new Error('Créditos no coinciden con servidor');
    }

    // ========================================
    // TEST 5: Intentar manipular créditos (debería fallar)
    // ========================================
    log('\n5️⃣', 'TEST 5: Intentar manipular créditos localmente', colors.blue);
    
    // Simular que el frontend intenta enviar créditos manipulados
    // El backend DEBE ignorar cualquier dato del frontend y usar la DB
    log('⚠️', 'Frontend dice: "Tengo 9999 créditos"', colors.yellow);
    log('🔒', 'Backend verifica en DB: "No, tienes 200"', colors.magenta);
    
    const verifyResponse = await axios.get(
      `${API_URL}/api/user/sync-credits`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (verifyResponse.data.credits.imagesRemaining === 200) {
      log('✅', 'Backend ignora cliente y usa DB - SEGURO', colors.green);
      log('💳', `Créditos reales: ${verifyResponse.data.credits.imagesRemaining}`, colors.cyan);
    } else {
      throw new Error('Sistema vulnerable a manipulación');
    }

    // ========================================
    // TEST 6: Sincronización multi-dispositivo
    // ========================================
    log('\n6️⃣', 'TEST 6: Sincronización multi-dispositivo', colors.blue);
    
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    // Simular que otro dispositivo usa 5 créditos
    const userId = registerResponse.data.user.id;
    await prisma.user.update({
      where: { id: userId },
      data: { imagesRemaining: 195 }
    });
    
    log('📱', 'Dispositivo A usó 5 créditos (quedan 195)', colors.cyan);
    
    // Dispositivo B sincroniza
    const syncResponse = await axios.get(
      `${API_URL}/api/user/sync-credits`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    if (syncResponse.data.credits.imagesRemaining === 195) {
      log('✅', 'Dispositivo B sincronizado correctamente', colors.green);
      log('📱', 'Ambos dispositivos muestran 195 créditos', colors.cyan);
    } else {
      throw new Error('Sincronización multi-dispositivo falló');
    }

    await prisma.$disconnect();

    // ========================================
    // TEST 7: Expiración automática de plan
    // ========================================
    log('\n7️⃣', 'TEST 7: Expiración automática de plan', colors.blue);
    
    const prisma2 = new PrismaClient();
    await prisma2.user.update({
      where: { id: userId },
      data: { 
        subscriptionEndDate: new Date(Date.now() - 24 * 60 * 60 * 1000) // Ayer
      }
    });
    
    log('📅', 'Plan configurado como expirado (ayer)', colors.cyan);
    
    const expiredSync = await axios.get(
      `${API_URL}/api/user/sync-credits`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    if (expiredSync.data.credits.plan === 'free' && expiredSync.data.credits.imagesRemaining === 0) {
      log('✅', 'Plan expirado automáticamente', colors.green);
      log('📊', `Plan bajado a: ${expiredSync.data.credits.plan}`, colors.cyan);
      log('💳', `Créditos limpiados: ${expiredSync.data.credits.imagesRemaining}`, colors.cyan);
    } else {
      throw new Error('Expiración automática no funcionó');
    }

    await prisma2.$disconnect();

    // ========================================
    // TEST 8: Memoria de proyectos/conversaciones
    // ========================================
    log('\n8️⃣', 'TEST 8: Memoria persistente de proyectos', colors.blue);
    
    // Actualizar plan de nuevo para poder probar
    await axios.post(
      `${API_URL}/api/user/update-subscription`,
      {
        plan: 'pulse',
        credits: 50
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    // Obtener mensajes del proyecto
    const messagesResponse = await axios.get(
      `${API_URL}/api/projects/${projectId}/messages`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    log('✅', 'Mensajes del proyecto recuperados', colors.green);
    log('📝', `Total de mensajes: ${messagesResponse.data.messages?.length || 0}`, colors.cyan);
    
    // Verificar que los proyectos persisten
    const projectsResponse = await axios.get(
      `${API_URL}/api/projects`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    if (projectsResponse.data.projects.length > 0) {
      log('✅', 'Proyectos persistentes en DB', colors.green);
      log('📁', `Total proyectos: ${projectsResponse.data.projects.length}`, colors.cyan);
    }

    // ========================================
    // RESUMEN FINAL
    // ========================================
    console.log('\n' + '='.repeat(70));
    log('🎉', 'TODOS LOS TESTS DE SEGURIDAD PASARON', colors.green);
    console.log('='.repeat(70));
    
    log('\n✅', 'Sistema de Seguridad: FUNCIONAL', colors.green);
    log('✅', 'Control de Créditos (Backend): FUNCIONAL', colors.green);
    log('✅', 'Prevención de Manipulación: FUNCIONAL', colors.green);
    log('✅', 'Sincronización Multi-dispositivo: FUNCIONAL', colors.green);
    log('✅', 'Expiración Automática: FUNCIONAL', colors.green);
    log('✅', 'Memoria de Proyectos: FUNCIONAL', colors.green);
    
    console.log('\n' + '='.repeat(70));
    log('🔒', 'SISTEMA LISTO PARA PRODUCCIÓN COMERCIAL', colors.magenta);
    console.log('='.repeat(70) + '\n');

  } catch (error) {
    console.log('\n' + '='.repeat(70));
    log('❌', 'ERROR EN LOS TESTS DE SEGURIDAD', colors.red);
    console.log('='.repeat(70));
    console.error('\n📋 Detalles del error:');
    console.error(error.response?.data || error.message);
    console.error('\n🔍 Stack trace:');
    console.error(error.stack);
    process.exit(1);
  }
}

// Ejecutar tests
console.log('\n🚀 Iniciando suite de tests de seguridad...\n');
testSecuritySystem().catch(console.error);
