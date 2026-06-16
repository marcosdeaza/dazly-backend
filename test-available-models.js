// Test para encontrar qué modelos Gemini están disponibles en tu proyecto
const { GoogleAuth } = require('google-auth-library');
const fetch = require('node-fetch');
const path = require('path');

require('dotenv').config();

const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
const location = process.env.VERTEX_AI_LOCATION || 'us-central1';
const keyFilePath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!projectId || !keyFilePath) {
  console.error('❌ GOOGLE_CLOUD_PROJECT_ID and GOOGLE_APPLICATION_CREDENTIALS are required');
  process.exit(1);
}

// Lista de modelos a probar (en orden de preferencia)
const modelsToTest = [
  'gemini-1.5-flash-001',
  'gemini-1.5-flash',
  'gemini-1.5-pro-001', 
  'gemini-1.5-pro',
  'gemini-pro',
  'gemini-pro-vision',
  'gemini-1.0-pro',
  'gemini-1.0-pro-vision'
];

async function testModel(modelName) {
  try {
    console.log(`\n🧪 Probando modelo: ${modelName}...`);
    
    // Configurar autenticación
    const auth = new GoogleAuth({
      keyFile: keyFilePath,
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();
    
    const apiURL = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${modelName}:generateContent`;
    
    const requestBody = {
      contents: [{
        role: 'user',
        parts: [{ text: 'Hola, solo estoy probando si funcionas.' }]
      }],
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 100
      }
    };
    
    const response = await fetch(apiURL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ ${modelName} - FUNCIONA!`);
      console.log(`   Respuesta: ${data.candidates?.[0]?.content?.parts?.[0]?.text?.substring(0, 50)}...`);
      return true;
    } else {
      const error = await response.text();
      console.log(`❌ ${modelName} - Error ${response.status}`);
      if (response.status === 404) {
        console.log(`   (Modelo no disponible en tu región/proyecto)`);
      } else {
        console.log(`   Error: ${error.substring(0, 100)}`);
      }
      return false;
    }
  } catch (error) {
    console.log(`❌ ${modelName} - Error: ${error.message}`);
    return false;
  }
}

async function findAvailableModel() {
  console.log('🔍 Buscando modelos Gemini disponibles...');
  console.log(`📍 Proyecto: ${projectId}`);
  console.log(`🌍 Región: ${location}`);
  console.log(`🔑 Credenciales: ${keyFilePath}`);
  
  let foundModel = null;
  
  for (const model of modelsToTest) {
    const works = await testModel(model);
    if (works && !foundModel) {
      foundModel = model;
      console.log(`\n🎉 ¡MODELO RECOMENDADO: ${foundModel}!`);
      console.log(`\n💡 Actualiza tu .env con:`);
      console.log(`   GEMINI_MODEL="${foundModel}"`);
    }
  }
  
  if (!foundModel) {
    console.log(`\n❌ No se encontró ningún modelo disponible.`);
    console.log(`\n🔧 Posibles soluciones:`);
    console.log(`   1. Habilita Vertex AI API en Google Cloud Console`);
    console.log(`   2. Verifica que tu Service Account tenga permisos`);
    console.log(`   3. Intenta otra región (us-central1, europe-west1, asia-east1)`);
  }
}

findAvailableModel().catch(console.error);
