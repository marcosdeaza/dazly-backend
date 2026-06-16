// test-gemini-quick.js - Prueba rápida de Gemini

const fetch = require('node-fetch');
require('dotenv').config();

console.log('\n🧪 TEST RÁPIDO DE GEMINI\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Configuración
const apiKey = process.env.VERTEX_AI_API_KEY;
const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
const location = process.env.VERTEX_AI_LOCATION || 'us-central1';
const useFallback = process.env.USE_FALLBACK_IMAGE_SERVICE === 'true';

console.log('📋 Configuración:');
console.log(`   Project ID: ${projectId}`);
console.log(`   Location: ${location}`);
console.log(`   API Key: ${apiKey ? `${apiKey.slice(0, 15)}...` : '❌ NO CONFIGURADA'}`);
console.log(`   Fallback: ${useFallback ? '✅ Activado (modo seguro)' : '❌ Desactivado (modo real)'}\n`);

if (useFallback) {
  console.log('⚠️  NOTA: Fallback está activado.');
  console.log('   Para probar Gemini real, cambia en .env:');
  console.log('   USE_FALLBACK_IMAGE_SERVICE=false\n');
  process.exit(0);
}

if (!apiKey) {
  console.error('❌ ERROR: VERTEX_AI_API_KEY no está configurada en .env');
  console.log('\n📚 Lee: COMO_OBTENER_API_KEY_VERTEX.md\n');
  process.exit(1);
}

const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/gemini-2.0-flash-exp:generateContent`;

console.log('🔗 URL del endpoint:');
console.log(`   ${url}\n`);

async function testGemini() {
  console.log('📤 Enviando petición a Gemini...\n');
  
  const testPrompt = 'Hola Gemini, responde brevemente: ¿Cómo puedes ayudar a crear diseños?';
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [{ text: testPrompt }]
        }],
        generationConfig: {
          temperature: 0.8,
          topP: 0.95,
          maxOutputTokens: 2048
        }
      })
    });
    
    const data = await response.text();
    
    console.log(`📥 Status: ${response.status} ${response.statusText}\n`);
    
    if (response.ok) {
      const parsed = JSON.parse(data);
      
      if (parsed.candidates && parsed.candidates[0]) {
        const text = parsed.candidates[0].content.parts.map(p => p.text).join('');
        
        console.log('✅ ¡ÉXITO! Gemini respondió:\n');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(text);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        console.log('🎉 ¡Gemini funciona correctamente!');
        console.log('   Ahora puedes usar Dazly con IA real.\n');
        console.log('📝 Próximos pasos:');
        console.log('   1. npm start (iniciar backend)');
        console.log('   2. Ir al frontend y enviar un mensaje');
        console.log('   3. Ver los logs en la consola del backend\n');
      } else {
        console.log('⚠️  Respuesta inesperada:', parsed);
      }
    } else {
      console.log('❌ ERROR en la petición\n');
      
      let errorData;
      try {
        errorData = JSON.parse(data);
      } catch {
        errorData = { message: data };
      }
      
      console.log('📥 Detalles del error:');
      console.log(JSON.stringify(errorData, null, 2));
      console.log('\n');
      
      if (response.status === 401) {
        console.log('💡 Solución: API Key inválida');
        console.log('   1. Ve a https://makersuite.google.com/app/apikey');
        console.log('   2. Regenera la API Key');
        console.log('   3. Actualiza VERTEX_AI_API_KEY en .env\n');
      } else if (response.status === 403) {
        console.log('💡 Solución: Sin permisos');
        console.log('   1. Ve a https://console.cloud.google.com');
        console.log('   2. Habilita "Vertex AI API"');
        console.log('   3. Habilita "Generative Language API"\n');
      } else if (response.status === 404) {
        console.log('💡 Solución: Modelo no encontrado');
        console.log('   Opciones:');
        console.log('   A) Verifica GOOGLE_CLOUD_PROJECT_ID');
        console.log('   B) Prueba con gemini-1.5-flash en lugar de gemini-2.0-flash-exp');
        console.log('   C) Verifica que tu región tenga acceso a gemini-2.0\n');
      }
    }
    
  } catch (error) {
    console.log('❌ ERROR de conexión:', error.message);
    console.log('\n💡 Verifica:');
    console.log('   1. Conexión a internet');
    console.log('   2. Firewall no bloquea Google APIs');
    console.log('   3. Variables de entorno correctas\n');
  }
}

testGemini();
