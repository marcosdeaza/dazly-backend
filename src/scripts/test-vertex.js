// src/scripts/test-vertex.js

require('dotenv').config();
const vertexAI = require('../services/vertexAI');

async function testVertexAI() {
  console.log('🧪 Testing Vertex AI Connection...\n');

  try {
    // Test health check
    console.log('1. Testing health check...');
    const health = await vertexAI.healthCheck();
    console.log('Health Check Result:', health);
    
    if (health.status !== 'healthy') {
      console.log('❌ Vertex AI health check failed');
      return;
    }
    
    console.log('✅ Vertex AI health check passed\n');

    // Test image generation
    console.log('2. Testing image generation...');
    const testPrompt = 'A beautiful sunset over a mountain landscape';
    
    const result = await vertexAI.generateImage(testPrompt, {
      style: 'photorealistic',
      quality: 'high'
    });

    if (result.success) {
      console.log('✅ Image generation successful!');
      console.log('Image URL:', result.imageUrl);
      console.log('Metadata:', result.metadata);
    } else {
      console.log('❌ Image generation failed');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  }
}

// Ejecutar test
if (require.main === module) {
  testVertexAI();
}

module.exports = { testVertexAI };